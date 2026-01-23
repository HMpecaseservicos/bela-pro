import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WhatsAppOutgoingMessage,
  WhatsAppTextMessage,
  WhatsAppButtonMessage,
  WhatsAppListMessage,
} from './chatbot.types';

/**
 * WhatsAppService
 * 
 * Abstração para a WhatsApp Cloud API.
 * Responsável por enviar mensagens e gerenciar a comunicação.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly webhookVerifyToken: string;

  constructor(private readonly configService: ConfigService) {
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN') || '';
    this.phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
    this.webhookVerifyToken = this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'bela-pro-verify';
  }

  /**
   * Verifica se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!this.accessToken && !!this.phoneNumberId;
  }

  /**
   * Retorna o token de verificação do webhook
   */
  getWebhookVerifyToken(): string {
    return this.webhookVerifyToken;
  }

  /**
   * Envia mensagem via WhatsApp Cloud API
   */
  async sendMessage(message: WhatsAppOutgoingMessage): Promise<{ messageId: string; success: boolean }> {
    if (!this.isConfigured()) {
      this.logger.warn('[WhatsApp] Serviço não configurado. Mensagem não enviada.');
      return { messageId: '', success: false };
    }

    try {
      const url = `${this.apiUrl}/${this.phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`[WhatsApp] Erro ao enviar: ${JSON.stringify(data)}`);
        return { messageId: '', success: false };
      }

      const messageId = data.messages?.[0]?.id || '';
      this.logger.log(`[WhatsApp] Mensagem enviada: ${messageId} para ${message.to}`);
      
      return { messageId, success: true };
    } catch (error) {
      this.logger.error(`[WhatsApp] Erro: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { messageId: '', success: false };
    }
  }

  // ==========================================================================
  // MESSAGE BUILDERS
  // ==========================================================================

  /**
   * Cria mensagem de texto simples
   */
  createTextMessage(to: string, text: string): WhatsAppTextMessage {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };
  }

  /**
   * Cria mensagem com botões (máx 3 botões, 20 chars cada)
   */
  createButtonMessage(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string,
  ): WhatsAppButtonMessage {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply' as const,
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20), // Limite 20 chars
            },
          })),
        },
      },
    };
  }

  /**
   * Cria mensagem com lista (menu)
   */
  createListMessage(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string,
  ): WhatsAppListMessage {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'list',
        ...(headerText && { header: { type: 'text', text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.map(section => ({
            title: section.title.slice(0, 24),
            rows: section.rows.map(row => ({
              id: row.id,
              title: row.title.slice(0, 24),
              ...(row.description && { description: row.description.slice(0, 72) }),
            })),
          })),
        },
      },
    };
  }

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  /**
   * Envia texto simples
   */
  async sendText(to: string, text: string): Promise<boolean> {
    const message = this.createTextMessage(to, text);
    const result = await this.sendMessage(message);
    return result.success;
  }

  /**
   * Envia menu principal
   */
  async sendMainMenu(to: string, clientName?: string): Promise<boolean> {
    const greeting = clientName ? `Olá, ${clientName}! 💜` : 'Olá! 💜';
    
    const message = this.createButtonMessage(
      to,
      `${greeting}\n\nSou a assistente virtual da BELA PRO. Como posso te ajudar?`,
      [
        { id: 'action_agendar', title: '📅 Agendar' },
        { id: 'action_reagendar', title: '🔄 Reagendar' },
        { id: 'action_cancelar', title: '❌ Cancelar' },
      ],
      'BELA PRO',
      'Digite "atendente" para falar com uma pessoa',
    );

    const result = await this.sendMessage(message);
    return result.success;
  }

  /**
   * Envia lista de serviços
   */
  async sendServicesList(
    to: string,
    services: Array<{ id: string; name: string; price: number; duration: number }>,
  ): Promise<boolean> {
    const rows = services.map(service => ({
      id: `service_${service.id}`,
      title: service.name.slice(0, 24),
      description: `R$ ${(service.price / 100).toFixed(2)} • ${service.duration}min`,
    }));

    const message = this.createListMessage(
      to,
      'Escolha o serviço que deseja agendar:',
      'Ver serviços',
      [{ title: 'Serviços disponíveis', rows }],
      '📋 Nossos Serviços',
    );

    const result = await this.sendMessage(message);
    return result.success;
  }

  /**
   * Envia lista de horários disponíveis
   */
  async sendTimeSlots(
    to: string,
    slots: Array<{ time: string; label: string }>,
    dateLabel: string,
  ): Promise<boolean> {
    const rows = slots.slice(0, 10).map(slot => ({
      id: `time_${slot.time}`,
      title: slot.label,
    }));

    const message = this.createListMessage(
      to,
      `Horários disponíveis para ${dateLabel}:`,
      'Ver horários',
      [{ title: 'Horários', rows }],
      '🕐 Escolha um horário',
    );

    const result = await this.sendMessage(message);
    return result.success;
  }

  /**
   * Envia confirmação de agendamento
   */
  async sendConfirmation(
    to: string,
    serviceName: string,
    date: string,
    time: string,
  ): Promise<boolean> {
    const message = this.createButtonMessage(
      to,
      `📝 *Confirme seu agendamento:*\n\n` +
      `💇 *Serviço:* ${serviceName}\n` +
      `📅 *Data:* ${date}\n` +
      `🕐 *Horário:* ${time}\n\n` +
      `Está tudo certo?`,
      [
        { id: 'confirm_yes', title: '✅ Confirmar' },
        { id: 'confirm_no', title: '❌ Corrigir' },
      ],
    );

    const result = await this.sendMessage(message);
    return result.success;
  }

  /**
   * Envia mensagem de sucesso
   */
  async sendSuccess(to: string, serviceName: string, date: string, time: string): Promise<boolean> {
    const text = 
      `✅ *Agendamento confirmado!*\n\n` +
      `💇 ${serviceName}\n` +
      `📅 ${date}\n` +
      `🕐 ${time}\n\n` +
      `Enviaremos um lembrete antes do horário.\n` +
      `Para cancelar ou reagendar, é só me chamar! 💜`;

    return this.sendText(to, text);
  }

  /**
   * Envia mensagem de handoff para humano
   */
  async sendHumanHandoff(to: string): Promise<boolean> {
    const text = 
      `👋 Entendi! Vou te transferir para um de nossos atendentes.\n\n` +
      `Aguarde um momento que logo alguém vai te responder.\n\n` +
      `_Se preferir, você pode voltar ao menu automático digitando "menu"._`;

    return this.sendText(to, text);
  }

  /**
   * Envia mensagem de erro/não entendi
   */
  async sendNotUnderstood(to: string): Promise<boolean> {
    const message = this.createButtonMessage(
      to,
      `Desculpe, não entendi. 😅\n\nPosso te ajudar com:`,
      [
        { id: 'action_agendar', title: '📅 Agendar' },
        { id: 'action_menu', title: '📋 Ver menu' },
        { id: 'action_humano', title: '👤 Atendente' },
      ],
    );

    const result = await this.sendMessage(message);
    return result.success;
  }
}
