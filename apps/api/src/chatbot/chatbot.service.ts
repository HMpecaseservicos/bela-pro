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
  normalizePhoneE164,
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

    await this.handleIncomingMessage(messageData, true); // true = usar Evolution API
  }

  /**
   * Processa uma mensagem recebida
   */
  async handleIncomingMessage(data: IncomingMessageData, useEvolutionApi = false): Promise<void> {
    const { phoneE164, contactName, messageText, phoneNumberId } = data;

    this.logger.log(`[Chatbot] Mensagem de ${phoneE164}: "${messageText}"`);

    try {
      // 1. Identificar workspace pelo phoneNumberId
      // TODO: Implementar mapeamento phoneNumberId -> workspaceId
      // Por enquanto, buscar workspace que tenha conversas com este telefone
      // ou usar um workspace padrão
      const workspaceId = await this.resolveWorkspaceId(phoneNumberId, phoneE164);

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
      const context =
        conversation.contextJson && typeof conversation.contextJson === 'object'
          ? (conversation.contextJson as ConversationContext)
          : {
              clientPhone: phoneE164,
              clientName: contactName,
              attemptCount: 0,
            };

      const transition = await this.stateMachine.process(
        workspaceId,
        conversation.state as ChatConversationState,
        context,
        messageText,
        data.rawPayload,
      );

      // 7. Atualizar conversa
      const newContext = { ...context, ...transition.context };
      
      await this.prisma.chatbotConversation.update({
        where: { id: conversation.id },
        data: {
          state: transition.nextState,
          contextJson: newContext as any,
          isHumanHandoff: transition.nextState === ChatConversationState.HUMAN_HANDOFF,
        },
      });

      // 8. Enviar resposta (se houver)
      if (transition.response) {
        let success = false;
        let responseText = '';

        if (useEvolutionApi) {
          // Usar Evolution API
          try {
            if (transition.response.type === 'text') {
              responseText = (transition.response as any).text.body;
              await this.evolutionApi.sendText({
                number: phoneE164,
                text: responseText,
              });
              success = true;
            } else if (transition.response.type === 'interactive') {
              // Converter para lista ou botões
              const interactive = (transition.response as any).interactive;
              if (interactive.type === 'list') {
                await this.evolutionApi.sendList({
                  number: phoneE164,
                  title: interactive.header?.text || 'Escolha uma opção',
                  description: interactive.body.text,
                  buttonText: interactive.action.button,
                  sections: interactive.action.sections,
                });
                responseText = interactive.body.text;
                success = true;
              } else if (interactive.type === 'button') {
                await this.evolutionApi.sendButtons({
                  number: phoneE164,
                  title: interactive.header?.text || 'BELA PRO',
                  description: interactive.body.text,
                  buttons: interactive.action.buttons.map((btn: any) => ({
                    buttonId: btn.reply.id,
                    buttonText: btn.reply.title,
                  })),
                });
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
          responseText = transition.response.type === 'text' 
            ? (transition.response as any).text.body 
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
  ): Promise<string | null> {
    // TODO: Implementar tabela de mapeamento phoneNumberId -> workspaceId
    // Por enquanto, buscar workspace que tenha conversas com este cliente
    
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
          contextJson: initialContext as any,
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
