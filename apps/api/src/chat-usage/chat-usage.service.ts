import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ActiveConversationCheck,
  BillingLogPayload,
  BillingProcessResult,
  ConversationRegistrationResult,
  calculateWindowEnd,
  getCurrentYearMonth,
  getConversationLimit,
  isWindowActive,
  MessageContext,
  MonthlyUsage,
} from './chat-usage.types';

/**
 * ChatUsageService
 * 
 * Serviço responsável pelo controle de uso de conversas por workspace.
 * Implementa o modelo de billing da Meta:
 * - 1 conversa = janela de 24h
 * - Múltiplas mensagens dentro de 24h = 1 conversa
 * - Excedente é contabilizado, nunca bloqueado
 * 
 * @example
 * // No webhook handler, antes do FSM:
 * const result = await chatUsageService.processMessageBilling({
 *   workspaceId: 'workspace123',
 *   conversationId: 'conv456',
 *   phoneE164: '+5511999999999',
 *   lastMessageAt: new Date('2026-01-22T10:00:00Z'),
 * });
 * // result.shouldProcess é sempre true (nunca bloqueamos)
 * // result.isExcess indica se passou do limite
 */
@Injectable()
export class ChatUsageService {
  private readonly logger = new Logger(ChatUsageService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // MÉTODO PRINCIPAL: Processamento de Billing para Webhook
  // ==========================================================================

  /**
   * Processa o billing para uma mensagem recebida.
   * Este é o ÚNICO método que o webhook precisa chamar.
   * 
   * Fluxo:
   * 1. Verifica se há conversa ativa (janela de 24h)
   * 2. Se não houver, registra nova conversa
   * 3. Retorna resultado (nunca bloqueia)
   * 
   * @param context Contexto da mensagem
   * @returns Resultado do processamento (shouldProcess é sempre true)
   */
  async processMessageBilling(context: MessageContext): Promise<BillingProcessResult> {
    const { workspaceId, conversationId, phoneE164, lastMessageAt } = context;

    try {
      // 1. Verificar se há conversa ativa
      const activeCheck = await this.hasActiveConversation(conversationId, lastMessageAt);

      if (activeCheck.isActive) {
        // Conversa dentro da janela de 24h - não contabilizar novamente
        this.log({
          event: 'CONVERSATION_REUSED',
          workspaceId,
          yearMonth: getCurrentYearMonth(),
          conversationId,
          phoneE164,
          windowEndsAt: activeCheck.windowEndsAt,
        });

        const monthlyUsage = await this.getOrCreateMonthlyUsage(workspaceId);

        return {
          shouldProcess: true,
          newConversationRegistered: false,
          isExcess: false,
          monthlyUsage,
        };
      }

      // 2. Nova conversa - registrar
      const registration = await this.registerNewConversation(
        workspaceId,
        conversationId,
        phoneE164,
      );

      const monthlyUsage = await this.getOrCreateMonthlyUsage(workspaceId);

      return {
        shouldProcess: true, // Nunca bloqueamos
        newConversationRegistered: true,
        isExcess: registration.isExcess,
        monthlyUsage,
      };

    } catch (error) {
      // Em caso de erro, permitir processamento mas logar
      this.log({
        event: 'BILLING_ERROR',
        workspaceId,
        yearMonth: getCurrentYearMonth(),
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Retornar estado seguro - não bloquear mensagem
      return {
        shouldProcess: true,
        newConversationRegistered: false,
        isExcess: false,
        monthlyUsage: {
          id: '',
          workspaceId,
          yearMonth: getCurrentYearMonth(),
          conversationsUsed: 0,
          conversationsLimit: 300,
          excessConversations: 0,
          lastConversationAt: null,
          limitReached: false,
          usagePercentage: 0,
        },
      };
    }
  }

  // ==========================================================================
  // VERIFICAÇÃO DE CONVERSA ATIVA
  // ==========================================================================

  /**
   * Verifica se uma conversa tem janela de 24h ativa.
   * 
   * Uma conversa é considerada ativa se:
   * - Existe um registro de billing com windowEndAt > now()
   * 
   * @param conversationId ID da conversa
   * @param lastMessageAt Timestamp da última mensagem (fallback)
   * @returns Informações sobre a janela ativa
   */
  async hasActiveConversation(
    conversationId: string,
    lastMessageAt: Date | null,
  ): Promise<ActiveConversationCheck> {
    const now = new Date();

    // Buscar último evento de billing para esta conversa
    const lastBillingEvent = await this.prisma.conversationBillingEvent.findFirst({
      where: {
        conversationId,
        windowEndAt: { gt: now }, // Janela ainda ativa
      },
      orderBy: { createdAt: 'desc' },
    });

    if (lastBillingEvent) {
      return {
        isActive: true,
        conversationId,
        windowEndsAt: lastBillingEvent.windowEndAt,
        remainingMs: lastBillingEvent.windowEndAt.getTime() - now.getTime(),
      };
    }

    // Fallback: verificar pela última mensagem se não houver billing event
    if (lastMessageAt) {
      const windowEnd = calculateWindowEnd(lastMessageAt);
      if (isWindowActive(windowEnd)) {
        return {
          isActive: true,
          conversationId,
          windowEndsAt: windowEnd,
          remainingMs: windowEnd.getTime() - now.getTime(),
        };
      }
    }

    return { isActive: false };
  }

  // ==========================================================================
  // REGISTRO DE NOVA CONVERSA
  // ==========================================================================

  /**
   * Registra uma nova conversa para billing.
   * 
   * Fluxo:
   * 1. Busca/cria registro mensal de uso
   * 2. Verifica se está dentro do limite
   * 3. Incrementa contador apropriado (used ou excess)
   * 4. Cria evento de billing para auditoria
   * 
   * @param workspaceId ID do workspace
   * @param conversationId ID da conversa
   * @param phoneE164 Telefone do cliente
   * @returns Resultado do registro
   */
  async registerNewConversation(
    workspaceId: string,
    conversationId: string,
    phoneE164: string,
  ): Promise<ConversationRegistrationResult> {
    const yearMonth = getCurrentYearMonth();
    const now = new Date();
    const windowEndAt = calculateWindowEnd(now);

    // Usar transaction para garantir consistência
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Buscar workspace para pegar o plano
      const workspace = await tx.workspace.findUnique({
        where: { id: workspaceId },
        select: { plan: true },
      });

      const plan = workspace?.plan ?? 'BASIC';
      const limit = getConversationLimit(plan);

      // 2. Buscar ou criar registro mensal
      let chatUsage = await tx.chatUsage.findUnique({
        where: { workspaceId_yearMonth: { workspaceId, yearMonth } },
      });

      if (!chatUsage) {
        chatUsage = await tx.chatUsage.create({
          data: {
            workspaceId,
            yearMonth,
            conversationsLimit: limit,
            conversationsUsed: 0,
            excessConversations: 0,
          },
        });

        this.log({
          event: 'MONTHLY_USAGE_CREATED',
          workspaceId,
          yearMonth,
          conversationsLimit: limit,
        });
      }

      // 3. Determinar se é excedente
      const isWithinLimit = chatUsage.conversationsUsed < chatUsage.conversationsLimit;
      const isExcess = !isWithinLimit;

      // 4. Incrementar contador apropriado
      const updatedUsage = await tx.chatUsage.update({
        where: { id: chatUsage.id },
        data: {
          conversationsUsed: isWithinLimit
            ? { increment: 1 }
            : chatUsage.conversationsUsed,
          excessConversations: isExcess
            ? { increment: 1 }
            : chatUsage.excessConversations,
          lastConversationAt: now,
        },
      });

      // 5. Criar evento de billing para auditoria
      const billingEvent = await tx.conversationBillingEvent.create({
        data: {
          workspaceId,
          conversationId,
          phoneE164,
          windowStartAt: now,
          windowEndAt,
          isExcess,
          yearMonth,
        },
      });

      return {
        updatedUsage,
        billingEvent,
        isExcess,
      };
    });

    // Logs de observabilidade
    if (result.isExcess) {
      this.log({
        event: 'EXCESS_REGISTERED',
        workspaceId,
        yearMonth,
        conversationId,
        phoneE164,
        conversationsUsed: result.updatedUsage.conversationsUsed,
        conversationsLimit: result.updatedUsage.conversationsLimit,
        excessConversations: result.updatedUsage.excessConversations,
        isExcess: true,
      });

      // Log especial quando limite é atingido pela primeira vez
      if (result.updatedUsage.excessConversations === 1) {
        this.log({
          event: 'LIMIT_REACHED',
          workspaceId,
          yearMonth,
          conversationsUsed: result.updatedUsage.conversationsUsed,
          conversationsLimit: result.updatedUsage.conversationsLimit,
        });
      }
    } else {
      this.log({
        event: 'NEW_CONVERSATION_DETECTED',
        workspaceId,
        yearMonth,
        conversationId,
        phoneE164,
        conversationsUsed: result.updatedUsage.conversationsUsed,
        conversationsLimit: result.updatedUsage.conversationsLimit,
        windowEndsAt: result.billingEvent.windowEndAt,
      });
    }

    return {
      success: true,
      isExcess: result.isExcess,
      conversationsUsed: result.updatedUsage.conversationsUsed,
      conversationsLimit: result.updatedUsage.conversationsLimit,
      excessConversations: result.updatedUsage.excessConversations,
      yearMonth,
      billingEventId: result.billingEvent.id,
    };
  }

  // ==========================================================================
  // CONSULTAS DE USO
  // ==========================================================================

  /**
   * Obtém ou cria o registro de uso mensal para um workspace.
   * 
   * @param workspaceId ID do workspace
   * @param yearMonth Mês de referência (opcional, default: atual)
   * @returns Uso mensal com informações adicionais
   */
  async getOrCreateMonthlyUsage(
    workspaceId: string,
    yearMonth?: string,
  ): Promise<MonthlyUsage> {
    const targetMonth = yearMonth ?? getCurrentYearMonth();

    // Buscar workspace para pegar o plano
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true },
    });

    const plan = workspace?.plan ?? 'BASIC';
    const limit = getConversationLimit(plan);

    // Buscar ou criar registro
    const chatUsage = await this.prisma.chatUsage.upsert({
      where: { workspaceId_yearMonth: { workspaceId, yearMonth: targetMonth } },
      create: {
        workspaceId,
        yearMonth: targetMonth,
        conversationsLimit: limit,
        conversationsUsed: 0,
        excessConversations: 0,
      },
      update: {}, // Não atualiza nada se já existir
    });

    const totalConversations = chatUsage.conversationsUsed + chatUsage.excessConversations;
    const usagePercentage = (totalConversations / chatUsage.conversationsLimit) * 100;

    return {
      id: chatUsage.id,
      workspaceId: chatUsage.workspaceId,
      yearMonth: chatUsage.yearMonth,
      conversationsUsed: chatUsage.conversationsUsed,
      conversationsLimit: chatUsage.conversationsLimit,
      excessConversations: chatUsage.excessConversations,
      lastConversationAt: chatUsage.lastConversationAt,
      limitReached: chatUsage.excessConversations > 0,
      usagePercentage: Math.round(usagePercentage * 100) / 100,
    };
  }

  /**
   * Obtém o histórico de uso dos últimos N meses.
   * 
   * @param workspaceId ID do workspace
   * @param months Número de meses (default: 6)
   * @returns Array de uso mensal
   */
  async getUsageHistory(
    workspaceId: string,
    months: number = 6,
  ): Promise<MonthlyUsage[]> {
    const records = await this.prisma.chatUsage.findMany({
      where: { workspaceId },
      orderBy: { yearMonth: 'desc' },
      take: months,
    });

    return records.map((record) => {
      const totalConversations = record.conversationsUsed + record.excessConversations;
      const usagePercentage = (totalConversations / record.conversationsLimit) * 100;

      return {
        id: record.id,
        workspaceId: record.workspaceId,
        yearMonth: record.yearMonth,
        conversationsUsed: record.conversationsUsed,
        conversationsLimit: record.conversationsLimit,
        excessConversations: record.excessConversations,
        lastConversationAt: record.lastConversationAt,
        limitReached: record.excessConversations > 0,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
      };
    });
  }

  /**
   * Obtém eventos de billing para uma conversa.
   * Útil para debugging e auditoria.
   * 
   * @param conversationId ID da conversa
   * @returns Array de eventos de billing
   */
  async getConversationBillingEvents(conversationId: string) {
    return this.prisma.conversationBillingEvent.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtém resumo de billing para um workspace em um mês.
   * Inclui todos os eventos de billing do período.
   * 
   * @param workspaceId ID do workspace
   * @param yearMonth Mês de referência
   */
  async getMonthlyBillingSummary(workspaceId: string, yearMonth?: string) {
    const targetMonth = yearMonth ?? getCurrentYearMonth();

    const [usage, events] = await Promise.all([
      this.getOrCreateMonthlyUsage(workspaceId, targetMonth),
      this.prisma.conversationBillingEvent.findMany({
        where: { workspaceId, yearMonth: targetMonth },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          conversationId: true,
          phoneE164: true,
          windowStartAt: true,
          windowEndAt: true,
          isExcess: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      usage,
      eventsCount: events.length,
      excessEventsCount: events.filter((e) => e.isExcess).length,
      recentEvents: events.slice(0, 10),
    };
  }

  // ==========================================================================
  // LOGGING ESTRUTURADO
  // ==========================================================================

  /**
   * Log estruturado para observabilidade.
   * Facilita busca e análise em ferramentas como Datadog, Loki, etc.
   */
  private log(payload: BillingLogPayload): void {
    const { event, ...data } = payload;

    switch (event) {
      case 'NEW_CONVERSATION_DETECTED':
        this.logger.log(`[BILLING] Nova conversa: ${JSON.stringify(data)}`);
        break;
      case 'CONVERSATION_REUSED':
        this.logger.debug(`[BILLING] Conversa reutilizada: ${JSON.stringify(data)}`);
        break;
      case 'LIMIT_REACHED':
        this.logger.warn(`[BILLING] ⚠️ LIMITE ATINGIDO: ${JSON.stringify(data)}`);
        break;
      case 'EXCESS_REGISTERED':
        this.logger.warn(`[BILLING] Excedente registrado: ${JSON.stringify(data)}`);
        break;
      case 'MONTHLY_USAGE_CREATED':
        this.logger.log(`[BILLING] Uso mensal criado: ${JSON.stringify(data)}`);
        break;
      case 'BILLING_ERROR':
        this.logger.error(`[BILLING] ❌ ERRO: ${JSON.stringify(data)}`);
        break;
    }
  }
}
