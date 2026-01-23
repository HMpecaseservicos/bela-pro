import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from './whatsapp.service';
import {
  ChatConversationState,
  ConversationContext,
  StateTransition,
  WhatsAppIncomingMessage,
  WhatsAppOutgoingMessage,
  containsKeyword,
  HUMAN_HANDOFF_KEYWORDS,
  CANCEL_KEYWORDS,
  formatPrice,
  formatDuration,
  formatDate,
  formatTime,
  CONFIRM_KEYWORDS,
  DENY_KEYWORDS,
} from './chatbot.types';

/**
 * StateMachineService
 * 
 * Motor da máquina de estados do chatbot.
 * Processa mensagens e determina transições de estado.
 */
@Injectable()
export class StateMachineService {
  private readonly logger = new Logger(StateMachineService.name);
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  /**
   * Processa uma mensagem e retorna a transição de estado
   */
  async process(
    workspaceId: string,
    currentState: ChatConversationState,
    context: ConversationContext,
    messageText: string,
    rawMessage?: WhatsAppIncomingMessage,
  ): Promise<StateTransition> {
    // Verificar keywords globais primeiro
    if (containsKeyword(messageText, HUMAN_HANDOFF_KEYWORDS)) {
      return this.handleHumanHandoff(context);
    }

    if (containsKeyword(messageText, CANCEL_KEYWORDS) && currentState !== ChatConversationState.START) {
      return this.handleCancel(context);
    }

    // Processar por estado
    switch (currentState) {
      case ChatConversationState.START:
        return this.handleStart(workspaceId, context, messageText);

      case ChatConversationState.CHOOSE_SERVICE:
        return this.handleChooseService(workspaceId, context, messageText);

      case ChatConversationState.CHOOSE_DATE:
        return this.handleChooseDate(workspaceId, context, messageText);

      case ChatConversationState.CHOOSE_TIME:
        return this.handleChooseTime(workspaceId, context, messageText);

      case ChatConversationState.CONFIRM:
        return this.handleConfirm(workspaceId, context, messageText);

      case ChatConversationState.DONE:
        return this.handleDone(context, messageText);

      case ChatConversationState.HUMAN_HANDOFF:
        return this.handleInHumanHandoff(context, messageText);

      default:
        return this.handleStart(workspaceId, context, messageText);
    }
  }

  // ==========================================================================
  // STATE HANDLERS
  // ==========================================================================

  /**
   * START: Menu principal
   */
  private async handleStart(
    workspaceId: string,
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    const normalizedMessage = messageText.toLowerCase().trim();

    // Se escolheu agendar
    if (
      normalizedMessage.includes('agendar') ||
      normalizedMessage === 'action_agendar' ||
      normalizedMessage === '1'
    ) {
      // Buscar serviços
      const services = await this.prisma.service.findMany({
        where: { workspaceId, isActive: true, showInBooking: true },
        orderBy: { sortOrder: 'asc' },
        take: 10,
      });

      if (services.length === 0) {
        return {
          nextState: ChatConversationState.START,
          response: this.whatsapp.createTextMessage(
            context.clientPhone,
            'Desculpe, não há serviços disponíveis no momento. 😔',
          ),
          context: { attemptCount: 0 },
        };
      }

      const rows = services.map(s => ({
        id: `service_${s.id}`,
        title: s.name.slice(0, 24),
        description: `${formatPrice(s.priceCents)} • ${formatDuration(s.durationMinutes)}`,
      }));

      return {
        nextState: ChatConversationState.CHOOSE_SERVICE,
        response: this.whatsapp.createListMessage(
          context.clientPhone,
          'Qual serviço você gostaria de agendar?',
          'Ver serviços',
          [{ title: 'Serviços', rows }],
          '💇 Nossos Serviços',
        ),
        context: { attemptCount: 0 },
      };
    }

    // Se escolheu reagendar ou cancelar (futuro)
    if (normalizedMessage.includes('reagendar') || normalizedMessage === 'action_reagendar') {
      return {
        nextState: ChatConversationState.START,
        response: this.whatsapp.createTextMessage(
          context.clientPhone,
          'Para reagendar, por favor entre em contato com um atendente.\nDigite "atendente" para falar com alguém.',
        ),
      };
    }

    if (normalizedMessage.includes('cancelar') || normalizedMessage === 'action_cancelar') {
      return {
        nextState: ChatConversationState.START,
        response: this.whatsapp.createTextMessage(
          context.clientPhone,
          'Para cancelar, por favor entre em contato com um atendente.\nDigite "atendente" para falar com alguém.',
        ),
      };
    }

    // Menu principal
    return {
      nextState: ChatConversationState.START,
      response: this.whatsapp.createButtonMessage(
        context.clientPhone,
        `Olá${context.clientName ? `, ${context.clientName}` : ''}! 💜\n\nSou a assistente virtual. Como posso te ajudar?`,
        [
          { id: 'action_agendar', title: '📅 Agendar' },
          { id: 'action_reagendar', title: '🔄 Reagendar' },
          { id: 'action_cancelar', title: '❌ Cancelar' },
        ],
        'BELA PRO',
        'Digite "atendente" para falar com uma pessoa',
      ),
      context: { attemptCount: 0 },
    };
  }

  /**
   * CHOOSE_SERVICE: Selecionar serviço
   */
  private async handleChooseService(
    workspaceId: string,
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    // Extrair ID do serviço
    let serviceId = '';
    
    if (messageText.startsWith('service_')) {
      serviceId = messageText.replace('service_', '');
    } else {
      // Tentar encontrar por nome
      const services = await this.prisma.service.findMany({
        where: { workspaceId, isActive: true },
      });
      
      const found = services.find(s => 
        s.name.toLowerCase().includes(messageText.toLowerCase())
      );
      
      if (found) {
        serviceId = found.id;
      }
    }

    // Validar serviço
    if (serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: serviceId, workspaceId, isActive: true },
      });

      if (service) {
        // Buscar datas disponíveis (próximos 7 dias)
        const today = new Date();
        const dates: Array<{ id: string; title: string }> = [];
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          const label = i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : formatDate(dateStr);
          
          dates.push({
            id: `date_${dateStr}`,
            title: label.slice(0, 24),
          });
        }

        return {
          nextState: ChatConversationState.CHOOSE_DATE,
          response: this.whatsapp.createListMessage(
            context.clientPhone,
            `Ótima escolha! 💜\n\n*${service.name}*\n${formatPrice(service.priceCents)} • ${formatDuration(service.durationMinutes)}\n\nQual dia você prefere?`,
            'Ver datas',
            [{ title: 'Datas disponíveis', rows: dates }],
            '📅 Escolha a data',
          ),
          context: {
            selectedServiceId: service.id,
            selectedServiceName: service.name,
            attemptCount: 0,
          },
        };
      }
    }

    // Não encontrou - incrementar tentativas
    const attempts = (context.attemptCount || 0) + 1;

    if (attempts >= this.MAX_ATTEMPTS) {
      return this.handleHumanHandoff(context);
    }

    // Reenviar lista
    const services = await this.prisma.service.findMany({
      where: { workspaceId, isActive: true, showInBooking: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    const rows = services.map(s => ({
      id: `service_${s.id}`,
      title: s.name.slice(0, 24),
      description: `${formatPrice(s.priceCents)} • ${formatDuration(s.durationMinutes)}`,
    }));

    return {
      nextState: ChatConversationState.CHOOSE_SERVICE,
      response: this.whatsapp.createListMessage(
        context.clientPhone,
        'Não encontrei esse serviço. Por favor, escolha da lista:',
        'Ver serviços',
        [{ title: 'Serviços', rows }],
      ),
      context: { attemptCount: attempts },
    };
  }

  /**
   * CHOOSE_DATE: Selecionar data
   */
  private async handleChooseDate(
    workspaceId: string,
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    let selectedDate = '';

    // Extrair data
    if (messageText.startsWith('date_')) {
      selectedDate = messageText.replace('date_', '');
    } else if (messageText.toLowerCase() === 'hoje') {
      selectedDate = new Date().toISOString().split('T')[0];
    } else if (messageText.toLowerCase() === 'amanhã' || messageText.toLowerCase() === 'amanha') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      selectedDate = tomorrow.toISOString().split('T')[0];
    } else {
      // Tentar parsear data (DD/MM ou DD/MM/YYYY)
      const match = messageText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3] || new Date().getFullYear().toString();
        selectedDate = `${year}-${month}-${day}`;
      }
    }

    if (selectedDate) {
      // TODO: Integrar com AvailabilityService para pegar slots reais
      // Por enquanto, horários mock
      const slots = [
        { time: '09:00', label: '09:00' },
        { time: '10:00', label: '10:00' },
        { time: '11:00', label: '11:00' },
        { time: '14:00', label: '14:00' },
        { time: '15:00', label: '15:00' },
        { time: '16:00', label: '16:00' },
      ];

      const rows = slots.map(s => ({
        id: `time_${s.time}`,
        title: s.label,
      }));

      return {
        nextState: ChatConversationState.CHOOSE_TIME,
        response: this.whatsapp.createListMessage(
          context.clientPhone,
          `📅 *${formatDate(selectedDate)}*\n\nEscolha um horário:`,
          'Ver horários',
          [{ title: 'Horários disponíveis', rows }],
          '🕐 Horários',
        ),
        context: {
          selectedDate,
          attemptCount: 0,
        },
      };
    }

    // Não entendeu - reenviar opções
    const attempts = (context.attemptCount || 0) + 1;

    if (attempts >= this.MAX_ATTEMPTS) {
      return this.handleHumanHandoff(context);
    }

    const today = new Date();
    const dates = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      dates.push({
        id: `date_${date.toISOString().split('T')[0]}`,
        title: i === 0 ? 'Hoje' : i === 1 ? 'Amanhã' : formatDate(date.toISOString().split('T')[0]).slice(0, 24),
      });
    }

    return {
      nextState: ChatConversationState.CHOOSE_DATE,
      response: this.whatsapp.createListMessage(
        context.clientPhone,
        'Não entendi a data. Por favor, escolha da lista:',
        'Ver datas',
        [{ title: 'Datas', rows: dates }],
      ),
      context: { attemptCount: attempts },
    };
  }

  /**
   * CHOOSE_TIME: Selecionar horário
   */
  private async handleChooseTime(
    workspaceId: string,
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    let selectedTime = '';

    if (messageText.startsWith('time_')) {
      selectedTime = messageText.replace('time_', '');
    } else {
      // Tentar parsear horário (HH:MM ou HHhMM ou HH)
      const match = messageText.match(/(\d{1,2})(?:[:h](\d{2}))?/);
      if (match) {
        const hour = match[1].padStart(2, '0');
        const minute = match[2] || '00';
        selectedTime = `${hour}:${minute}`;
      }
    }

    if (selectedTime && context.selectedDate && context.selectedServiceName) {
      return {
        nextState: ChatConversationState.CONFIRM,
        response: this.whatsapp.createButtonMessage(
          context.clientPhone,
          `📝 *Confirme seu agendamento:*\n\n` +
          `💇 *Serviço:* ${context.selectedServiceName}\n` +
          `📅 *Data:* ${formatDate(context.selectedDate)}\n` +
          `🕐 *Horário:* ${formatTime(selectedTime)}\n\n` +
          `Está tudo certo?`,
          [
            { id: 'confirm_yes', title: '✅ Confirmar' },
            { id: 'confirm_no', title: '❌ Corrigir' },
          ],
        ),
        context: {
          selectedTime,
          attemptCount: 0,
        },
      };
    }

    // Não entendeu
    const attempts = (context.attemptCount || 0) + 1;

    if (attempts >= this.MAX_ATTEMPTS) {
      return this.handleHumanHandoff(context);
    }

    return {
      nextState: ChatConversationState.CHOOSE_TIME,
      response: this.whatsapp.createTextMessage(
        context.clientPhone,
        'Não entendi o horário. Por favor, digite no formato HH:MM (ex: 14:30)',
      ),
      context: { attemptCount: attempts },
    };
  }

  /**
   * CONFIRM: Confirmar agendamento
   */
  private async handleConfirm(
    workspaceId: string,
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    const normalized = messageText.toLowerCase();

    // Confirmou
    if (
      normalized === 'confirm_yes' ||
      containsKeyword(normalized, CONFIRM_KEYWORDS)
    ) {
      // TODO: Criar agendamento via PublicBookingService
      // Por enquanto, simular sucesso

      return {
        nextState: ChatConversationState.DONE,
        response: this.whatsapp.createTextMessage(
          context.clientPhone,
          `✅ *Agendamento confirmado!*\n\n` +
          `💇 ${context.selectedServiceName}\n` +
          `📅 ${formatDate(context.selectedDate!)}\n` +
          `🕐 ${formatTime(context.selectedTime!)}\n\n` +
          `Enviaremos um lembrete antes do horário.\n` +
          `Para cancelar ou reagendar, é só me chamar! 💜`,
        ),
        context: {
          attemptCount: 0,
          pendingConfirmation: false,
        },
      };
    }

    // Quer corrigir
    if (
      normalized === 'confirm_no' ||
      containsKeyword(normalized, DENY_KEYWORDS)
    ) {
      return {
        nextState: ChatConversationState.START,
        response: this.whatsapp.createButtonMessage(
          context.clientPhone,
          'Sem problemas! Vamos recomeçar. O que você gostaria de fazer?',
          [
            { id: 'action_agendar', title: '📅 Agendar' },
            { id: 'action_humano', title: '👤 Atendente' },
          ],
        ),
        context: {
          selectedServiceId: undefined,
          selectedServiceName: undefined,
          selectedDate: undefined,
          selectedTime: undefined,
          attemptCount: 0,
        },
      };
    }

    // Não entendeu
    return {
      nextState: ChatConversationState.CONFIRM,
      response: this.whatsapp.createButtonMessage(
        context.clientPhone,
        'Por favor, confirme ou corrija:',
        [
          { id: 'confirm_yes', title: '✅ Confirmar' },
          { id: 'confirm_no', title: '❌ Corrigir' },
        ],
      ),
    };
  }

  /**
   * DONE: Agendamento concluído
   */
  private async handleDone(
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    // Qualquer mensagem volta ao menu
    return {
      nextState: ChatConversationState.START,
      response: this.whatsapp.createButtonMessage(
        context.clientPhone,
        'Posso ajudar com mais alguma coisa?',
        [
          { id: 'action_agendar', title: '📅 Novo agendamento' },
          { id: 'action_humano', title: '👤 Atendente' },
        ],
      ),
      context: {
        selectedServiceId: undefined,
        selectedServiceName: undefined,
        selectedDate: undefined,
        selectedTime: undefined,
        attemptCount: 0,
      },
    };
  }

  /**
   * HUMAN_HANDOFF: Conversa com humano
   */
  private async handleInHumanHandoff(
    context: ConversationContext,
    messageText: string,
  ): Promise<StateTransition> {
    // Se digitou "menu" ou "bot", volta ao automático
    if (
      messageText.toLowerCase() === 'menu' ||
      messageText.toLowerCase() === 'bot' ||
      messageText.toLowerCase() === 'voltar'
    ) {
      return {
        nextState: ChatConversationState.START,
        response: this.whatsapp.createButtonMessage(
          context.clientPhone,
          'Voltando ao menu automático! Como posso te ajudar?',
          [
            { id: 'action_agendar', title: '📅 Agendar' },
            { id: 'action_reagendar', title: '🔄 Reagendar' },
            { id: 'action_cancelar', title: '❌ Cancelar' },
          ],
        ),
        context: { attemptCount: 0 },
      };
    }

    // Não fazer nada - humano responde
    return {
      nextState: ChatConversationState.HUMAN_HANDOFF,
      response: null as any, // Não enviar resposta automática
    };
  }

  // ==========================================================================
  // GLOBAL HANDLERS
  // ==========================================================================

  /**
   * Handoff para humano
   */
  private handleHumanHandoff(context: ConversationContext): StateTransition {
    return {
      nextState: ChatConversationState.HUMAN_HANDOFF,
      response: this.whatsapp.createTextMessage(
        context.clientPhone,
        `👋 Entendi! Vou te transferir para um de nossos atendentes.\n\n` +
        `Aguarde um momento que logo alguém vai te responder.\n\n` +
        `_Se preferir, digite "menu" para voltar ao atendimento automático._`,
      ),
      context: { attemptCount: 0 },
    };
  }

  /**
   * Cancelar e voltar ao menu
   */
  private handleCancel(context: ConversationContext): StateTransition {
    return {
      nextState: ChatConversationState.START,
      response: this.whatsapp.createButtonMessage(
        context.clientPhone,
        'Ok, voltando ao menu principal. O que você gostaria de fazer?',
        [
          { id: 'action_agendar', title: '📅 Agendar' },
          { id: 'action_reagendar', title: '🔄 Reagendar' },
          { id: 'action_cancelar', title: '❌ Cancelar' },
        ],
      ),
      context: {
        selectedServiceId: undefined,
        selectedServiceName: undefined,
        selectedDate: undefined,
        selectedTime: undefined,
        attemptCount: 0,
      },
    };
  }
}
