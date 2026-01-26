import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatUsageService } from '../chat-usage/chat-usage.service';
import { WhatsAppService } from './whatsapp.service';
import { StateMachineService } from './state-machine.service';
import { EvolutionApiService, EvolutionWebhookPayload, EvolutionMessage } from './evolution-api.service';
import {
  ChatConversationState,
  ChatChannel,
  ConversationContext,
  IncomingMessageData,
  WhatsAppWebhookPayload,
  extractMessageText,
  isWhatsAppIncomingMessage,
  normalizePhoneE164,
  parseConversationContext,
  serializeConversationContext,
} from './chatbot.types';

/**
 * ChatbotService
 * 
 * Orquestrador principal do chatbot.
 * Responsável por:
 * - Receber mensagens do webhook
 * - Gerenciar conversas
 * - Integrar com billing
 * - Delegar para State Machine
 */
@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatUsage: ChatUsageService,
    private readonly whatsapp: WhatsAppService,
    private readonly stateMachine: StateMachineService,
    private readonly evolutionApi: EvolutionApiService,
  ) {}

  private buildDefaultEvolutionInstanceName(workspaceId: string): string {
    // Mantém simples e determinístico (instância por workspace)
    return `ws_${workspaceId.slice(0, 24)}`;
  }

  private extractConnectionState(status: unknown): string | null {
    if (!status || typeof status !== 'object') return null;
    const rec = status as Record<string, unknown>;

    const direct = rec.state;
    if (typeof direct === 'string') return direct;

    const instance = rec.instance;
    if (instance && typeof instance === 'object') {
      const state = (instance as Record<string, unknown>).state;
      if (typeof state === 'string') return state;
    }

    return null;
  }

  async getWhatsAppConnectionStatus(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        whatsappEvolutionInstanceName: true,
        whatsappWebhookUrl: true,
        whatsappLastConnectionState: true,
        whatsappLastConnectedAt: true,
      },
    });

    if (!ws?.whatsappEvolutionInstanceName) {
      return {
        hasInstance: false,
        instanceName: null,
        connectionState: ws?.whatsappLastConnectionState ?? null,
        webhookUrl: ws?.whatsappWebhookUrl ?? null,
        lastConnectedAt: ws?.whatsappLastConnectedAt ?? null,
      };
    }

    const status = await this.evolutionApi.getInstanceStatus(ws.whatsappEvolutionInstanceName).catch(() => null);
    const connectionState = this.extractConnectionState(status) ?? (typeof status === 'string' ? status : null);

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        whatsappLastConnectionState: connectionState ?? ws.whatsappLastConnectionState ?? null,
        whatsappLastConnectedAt: connectionState?.toLowerCase().includes('open') ? new Date() : ws.whatsappLastConnectedAt,
      },
    }).catch(() => {
      // best-effort
    });

    return {
      hasInstance: true,
      instanceName: ws.whatsappEvolutionInstanceName,
      connectionState,
      webhookUrl: ws.whatsappWebhookUrl ?? null,
      lastConnectedAt: ws.whatsappLastConnectedAt ?? null,
      rawStatus: status,
    };
  }

  async getWhatsAppQrCode(workspaceId: string, webhookUrl: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, whatsappEvolutionInstanceName: true },
    });

    if (!ws) {
      throw new Error('Workspace não encontrado');
    }

    const instanceName = ws.whatsappEvolutionInstanceName ?? this.buildDefaultEvolutionInstanceName(ws.id);

    // Persistir instanceName (uma vez) para ficar fixo
    if (!ws.whatsappEvolutionInstanceName) {
      await this.prisma.workspace.update({
        where: { id: ws.id },
        data: { whatsappEvolutionInstanceName: instanceName },
      });
    }

    // Garantir que a instância existe (se já existir, ignore erro)
    await this.evolutionApi.createInstance(instanceName).catch(() => {
      // best-effort
    });

    // Configurar webhook automaticamente
    await this.evolutionApi.configureWebhook(webhookUrl, instanceName).catch(() => {
      // best-effort
    });

    await this.prisma.workspace.update({
      where: { id: ws.id },
      data: { whatsappWebhookUrl: webhookUrl },
    }).catch(() => {
      // best-effort
    });

    return this.evolutionApi.getQRCode(instanceName);
  }

  async disconnectWhatsApp(workspaceId: string) {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { whatsappEvolutionInstanceName: true },
    });

    const instanceName = ws?.whatsappEvolutionInstanceName;
    if (!instanceName) {
      return { success: true };
    }

    await this.evolutionApi.logout(instanceName).catch(() => {
      // best-effort
    });

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        whatsappLastConnectionState: 'DISCONNECTED',
        whatsappLastConnectedAt: null,
      },
    }).catch(() => {
      // best-effort
    });

    return { success: true };
  }

  /**
   * Processa webhook do WhatsApp Cloud API
   */
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    this.logger.log('[Chatbot] Webhook Cloud API recebido');

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { value } = change;

        // Processar apenas mensagens (ignorar status updates)
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        const phoneNumberId = value.metadata.phone_number_id;

        for (const message of value.messages) {
          const contactInfo = value.contacts?.find(c => c.wa_id === message.from);
          
          const messageData: IncomingMessageData = {
            workspaceId: '', // Será resolvido abaixo
            phoneE164: normalizePhoneE164(message.from),
            contactName: contactInfo?.profile?.name || '',
            messageId: message.id,
            messageText: extractMessageText(message),
            messageType: message.type,
            rawPayload: message,
            phoneNumberId,
          };

          await this.handleIncomingMessage(messageData);
        }
      }
    }
  }

  /**
   * Processa webhook da Evolution API
   */
  async processEvolutionWebhook(payload: EvolutionWebhookPayload): Promise<void> {
    this.logger.log(`[Chatbot] Webhook Evolution API: ${payload.event}`);

    // Processar apenas eventos de mensagem
    if (payload.event !== 'MESSAGES_UPSERT') {
      this.logger.debug(`[Chatbot] Evento ignorado: ${payload.event}`);
      return;
    }

    const message = payload.data as EvolutionMessage;

    // Ignorar mensagens enviadas por nós
    if (message.key.fromMe) {
      return;
    }

    const phoneE164 = this.evolutionApi.extractPhoneNumber(message.key.remoteJid);
    const messageText = this.evolutionApi.extractMessageText(message);

    if (!messageText) {
      this.logger.debug('[Chatbot] Mensagem sem texto, ignorando');
      return;
    }

    const messageData: IncomingMessageData = {
      workspaceId: '', // Será resolvido abaixo
      phoneE164,
      contactName: message.pushName || '',
      messageId: message.key.id,
      messageText,
      messageType: 'text',
      rawPayload: message,
      phoneNumberId: payload.instance,
    };

    await this.handleIncomingMessage(messageData, { evolutionInstanceName: payload.instance });
  }

  /**
   * Processa uma mensagem recebida
   */
  async handleIncomingMessage(
    data: IncomingMessageData,
    options?: { evolutionInstanceName?: string },
  ): Promise<void> {
    const { phoneE164, contactName, messageText, phoneNumberId } = data;
    const evolutionInstanceName = options?.evolutionInstanceName;

    this.logger.log(`[Chatbot] Mensagem de ${phoneE164}: "${messageText}"`);

    try {
      // 1. Identificar workspace (Evolution: por instanceName; Cloud API: fallback)
      const workspaceId = await this.resolveWorkspaceId(
        evolutionInstanceName ?? phoneNumberId,
        phoneE164,
        { preferEvolutionInstance: Boolean(evolutionInstanceName) },
      );

      if (!workspaceId) {
        this.logger.warn(`[Chatbot] Workspace não encontrado para ${phoneNumberId}`);
        return;
      }

      // 2. Buscar ou criar conversa
      const conversation = await this.getOrCreateConversation(
        workspaceId,
        phoneE164,
        contactName,
      );

      // Se veio da Evolution, garantir que o workspace está vinculado à instância
      if (evolutionInstanceName) {
        await this.prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            whatsappEvolutionInstanceName: evolutionInstanceName,
          },
        }).catch(() => {
          // Ignora conflitos/erros (ex.: unique) para não travar processamento do webhook
        });
      }

      // 3. Processar billing (antes do FSM)
      const billingResult = await this.chatUsage.processMessageBilling({
        workspaceId,
        conversationId: conversation.id,
        phoneE164,
        lastMessageAt: conversation.updatedAt,
      });

      this.logger.log(
        `[Chatbot] Billing: nova=${billingResult.newConversationRegistered}, ` +
        `excesso=${billingResult.isExcess}, ` +
        `uso=${billingResult.monthlyUsage.conversationsUsed}/${billingResult.monthlyUsage.conversationsLimit}`,
      );

      // 4. Salvar mensagem recebida
      await this.saveMessage(conversation.id, 'in', messageText, data.rawPayload);

      // 5. Verificar se está em handoff humano
      if (conversation.isHumanHandoff) {
        // Não processar automaticamente - humano responde
        this.logger.log(`[Chatbot] Conversa em handoff humano, ignorando FSM`);
        return;
      }

      // 6. Processar FSM
      const fallbackContext: ConversationContext = {
        clientPhone: phoneE164,
        clientName: contactName,
        attemptCount: 0,
      };

      const context = parseConversationContext(conversation.contextJson) ?? fallbackContext;

      const rawMessageForFsm = isWhatsAppIncomingMessage(data.rawPayload)
        ? data.rawPayload
        : undefined;

      const transition = await this.stateMachine.process(
        workspaceId,
        conversation.state as ChatConversationState,
        context,
        messageText,
        rawMessageForFsm,
      );

      // 7. Atualizar conversa
      const newContext = { ...context, ...transition.context };
      
      await this.prisma.chatbotConversation.update({
        where: { id: conversation.id },
        data: {
          state: transition.nextState,
          contextJson: serializeConversationContext(newContext),
          isHumanHandoff: transition.nextState === ChatConversationState.HUMAN_HANDOFF,
        },
      });

      // 8. Enviar resposta (se houver)
      if (transition.response) {
        let success = false;
        let responseText = '';

        if (evolutionInstanceName) {
          // Usar Evolution API
          try {
            if (transition.response.type === 'text') {
              responseText = transition.response.text.body;
              await this.evolutionApi.sendText({
                number: phoneE164,
                text: responseText,
              }, evolutionInstanceName);
              success = true;
            } else if (transition.response.type === 'interactive') {
              // Converter para lista ou botões
              const { interactive } = transition.response;
              if (interactive.type === 'list') {
                await this.evolutionApi.sendList({
                  number: phoneE164,
                  title: interactive.header?.text || 'Escolha uma opção',
                  description: interactive.body.text,
                  buttonText: interactive.action.button,
                  sections: interactive.action.sections.map((section) => ({
                    title: section.title,
                    rows: section.rows.map((row) => ({
                      rowId: row.id,
                      title: row.title,
                      description: row.description,
                    })),
                  })),
                }, evolutionInstanceName);
                responseText = interactive.body.text;
                success = true;
              } else if (interactive.type === 'button') {
                await this.evolutionApi.sendButtons({
                  number: phoneE164,
                  title: interactive.header?.text || 'BELA PRO',
                  description: interactive.body.text,
                  buttons: interactive.action.buttons.map((btn) => ({
                    buttonId: btn.reply.id,
                    buttonText: btn.reply.title,
                  })),
                }, evolutionInstanceName);
                responseText = interactive.body.text;
                success = true;
              }
            }
          } catch (error) {
            this.logger.error(`[Chatbot] Erro ao enviar via Evolution: ${error}`);
          }
        } else {
          // Usar WhatsApp Cloud API
          const result = await this.whatsapp.sendMessage(transition.response);
          success = result.success;
          responseText =
            transition.response.type === 'text'
              ? transition.response.text.body
              : JSON.stringify(transition.response);
        }
        
        if (success) {
          // Salvar mensagem enviada
          await this.saveMessage(conversation.id, 'out', responseText);
        }
      }

      this.logger.log(
        `[Chatbot] Transição: ${conversation.state} -> ${transition.nextState}`,
      );

    } catch (error) {
      this.logger.error(
        `[Chatbot] Erro ao processar mensagem: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
      
      // Tentar enviar mensagem de erro
      try {
        await this.whatsapp.sendText(
          phoneE164,
          'Desculpe, ocorreu um erro. Por favor, tente novamente ou digite "atendente" para falar com uma pessoa.',
        );
      } catch {
        // Ignorar erro ao enviar mensagem de erro
      }
    }
  }

  /**
   * Resolve workspaceId a partir do phoneNumberId
   */
  private async resolveWorkspaceId(
    phoneNumberId: string,
    clientPhone: string,
    opts?: { preferEvolutionInstance?: boolean },
  ): Promise<string | null> {
    // Evolution: mapear instanceName -> workspaceId (determinístico)
    if (opts?.preferEvolutionInstance && phoneNumberId) {
      const workspaceByInstance = await this.prisma.workspace.findFirst({
        where: { whatsappEvolutionInstanceName: phoneNumberId, chatbotEnabled: true },
        select: { id: true },
      });

      if (workspaceByInstance) {
        return workspaceByInstance.id;
      }
    }

    // Fallback: buscar conversa existente por telefone
    
    const existingConversation = await this.prisma.chatbotConversation.findFirst({
      where: { phoneE164: clientPhone },
      select: { workspaceId: true },
    });

    if (existingConversation) {
      return existingConversation.workspaceId;
    }

    // Fallback: usar primeiro workspace ativo
    // Em produção, isso deve ser resolvido via configuração
    const workspace = await this.prisma.workspace.findFirst({
      where: { chatbotEnabled: true },
      select: { id: true },
    });

    return workspace?.id || null;
  }

  /**
   * Busca ou cria conversa
   */
  private async getOrCreateConversation(
    workspaceId: string,
    phoneE164: string,
    contactName: string,
  ) {
    // Buscar conversa existente
    let conversation = await this.prisma.chatbotConversation.findUnique({
      where: {
        workspaceId_channel_phoneE164: {
          workspaceId,
          channel: ChatChannel.WHATSAPP,
          phoneE164,
        },
      },
    });

    if (!conversation) {
      // Criar nova conversa
      const initialContext: ConversationContext = {
        clientPhone: phoneE164,
        clientName: contactName,
        attemptCount: 0,
      };

      conversation = await this.prisma.chatbotConversation.create({
        data: {
          workspaceId,
          channel: ChatChannel.WHATSAPP,
          phoneE164,
          state: ChatConversationState.START,
          contextJson: serializeConversationContext(initialContext),
          isHumanHandoff: false,
        },
      });

      this.logger.log(`[Chatbot] Nova conversa criada: ${conversation.id}`);
    }

    return conversation;
  }

  /**
   * Salva mensagem no histórico
   */
  private async saveMessage(
    conversationId: string,
    direction: 'in' | 'out',
    text: string,
    rawJson?: any,
  ): Promise<void> {
    await this.prisma.chatbotMessage.create({
      data: {
        conversationId,
        direction,
        text,
        rawJson: rawJson || null,
      },
    });
  }

  // ==========================================================================
  // ADMIN METHODS
  // ==========================================================================

  /**
   * Lista conversas de um workspace
   */
  async listConversations(
    workspaceId: string,
    options?: {
      state?: ChatConversationState;
      isHumanHandoff?: boolean;
      limit?: number;
    },
  ) {
    return this.prisma.chatbotConversation.findMany({
      where: {
        workspaceId,
        ...(options?.state && { state: options.state }),
        ...(options?.isHumanHandoff !== undefined && { isHumanHandoff: options.isHumanHandoff }),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit || 50,
    });
  }

  /**
   * Busca conversa com mensagens
   */
  async getConversation(conversationId: string) {
    return this.prisma.chatbotConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });
  }

  /**
   * Marca conversa para handoff humano
   */
  async setHumanHandoff(conversationId: string, isHandoff: boolean) {
    return this.prisma.chatbotConversation.update({
      where: { id: conversationId },
      data: {
        isHumanHandoff: isHandoff,
        state: isHandoff ? ChatConversationState.HUMAN_HANDOFF : ChatConversationState.START,
      },
    });
  }

  /**
   * Envia mensagem manual (admin)
   */
  async sendManualMessage(conversationId: string, text: string) {
    const conversation = await this.prisma.chatbotConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversa não encontrada');
    }

    const success = await this.whatsapp.sendText(conversation.phoneE164, text);

    if (success) {
      await this.saveMessage(conversationId, 'out', text);
    }

    return { success };
  }
}
