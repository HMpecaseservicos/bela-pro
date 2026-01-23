import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Evolution API Service
 * 
 * Integração com Evolution API para WhatsApp.
 * Documentação: https://doc.evolution-api.com
 */

export interface EvolutionMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
    buttonResponseMessage?: {
      selectedButtonId: string;
    };
    listResponseMessage?: {
      singleSelectReply: {
        selectedRowId: string;
      };
    };
  };
  messageTimestamp: number;
  pushName: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessage | any;
}

export interface SendMessageOptions {
  number: string;
  text: string;
  delay?: number;
}

export interface SendButtonsOptions {
  number: string;
  title: string;
  description: string;
  footer?: string;
  buttons: Array<{
    buttonId: string;
    buttonText: string;
  }>;
}

export interface SendListOptions {
  number: string;
  title: string;
  description: string;
  buttonText: string;
  footerText?: string;
  sections: Array<{
    title: string;
    rows: Array<{
      rowId: string;
      title: string;
      description?: string;
    }>;
  }>;
}

@Injectable()
export class EvolutionApiService {
  private readonly logger = new Logger(EvolutionApiService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instanceName: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('EVOLUTION_API_URL') || 'http://localhost:8080';
    this.apiKey = this.configService.get<string>('EVOLUTION_API_KEY') || '';
    this.instanceName = this.configService.get<string>('EVOLUTION_INSTANCE_NAME') || 'bela-pro';
  }

  /**
   * Extrai o texto de uma mensagem recebida
   */
  extractMessageText(message: EvolutionMessage): string {
    if (message.message.conversation) {
      return message.message.conversation;
    }
    if (message.message.extendedTextMessage?.text) {
      return message.message.extendedTextMessage.text;
    }
    if (message.message.buttonResponseMessage?.selectedButtonId) {
      return message.message.buttonResponseMessage.selectedButtonId;
    }
    if (message.message.listResponseMessage?.singleSelectReply?.selectedRowId) {
      return message.message.listResponseMessage.singleSelectReply.selectedRowId;
    }
    return '';
  }

  /**
   * Extrai o número de telefone (formato E.164)
   */
  extractPhoneNumber(remoteJid: string): string {
    // remoteJid formato: 5511999999999@s.whatsapp.net
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    return `+${phone}`;
  }

  /**
   * Formata número para o padrão da Evolution API
   */
  private formatNumber(phoneE164: string): string {
    // Remove o + e qualquer caractere não numérico
    return phoneE164.replace(/\D/g, '');
  }

  /**
   * Faz requisição para a Evolution API
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      this.logger.error(`Evolution API request failed: ${error}`);
      throw error;
    }
  }

  /**
   * Verifica o status da instância
   */
  async getInstanceStatus(): Promise<any> {
    return this.request('GET', `/instance/connectionState/${this.instanceName}`);
  }

  /**
   * Obtém o QR Code para conexão
   */
  async getQRCode(): Promise<{ base64: string; code: string } | null> {
    try {
      const result = await this.request<any>('GET', `/instance/connect/${this.instanceName}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to get QR Code:', error);
      return null;
    }
  }

  /**
   * Cria uma nova instância
   */
  async createInstance(): Promise<any> {
    return this.request('POST', '/instance/create', {
      instanceName: this.instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });
  }

  /**
   * Envia mensagem de texto simples
   */
  async sendText(options: SendMessageOptions): Promise<any> {
    const number = this.formatNumber(options.number);
    
    this.logger.log(`Sending text to ${number}: ${options.text.substring(0, 50)}...`);

    return this.request('POST', `/message/sendText/${this.instanceName}`, {
      number,
      text: options.text,
      delay: options.delay || 1000,
    });
  }

  /**
   * Envia mensagem com botões
   */
  async sendButtons(options: SendButtonsOptions): Promise<any> {
    const number = this.formatNumber(options.number);

    this.logger.log(`Sending buttons to ${number}`);

    return this.request('POST', `/message/sendButtons/${this.instanceName}`, {
      number,
      title: options.title,
      description: options.description,
      footer: options.footer || 'BELA PRO',
      buttons: options.buttons.map((btn, index) => ({
        type: 'reply',
        buttonId: btn.buttonId,
        buttonText: { displayText: btn.buttonText },
      })),
    });
  }

  /**
   * Envia mensagem com lista de opções
   */
  async sendList(options: SendListOptions): Promise<any> {
    const number = this.formatNumber(options.number);

    this.logger.log(`Sending list to ${number}`);

    return this.request('POST', `/message/sendList/${this.instanceName}`, {
      number,
      title: options.title,
      description: options.description,
      buttonText: options.buttonText,
      footerText: options.footerText || 'BELA PRO',
      sections: options.sections,
    });
  }

  /**
   * Configura o webhook para receber mensagens
   */
  async configureWebhook(webhookUrl: string): Promise<any> {
    this.logger.log(`Configuring webhook: ${webhookUrl}`);

    return this.request('POST', `/webhook/set/${this.instanceName}`, {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
        ],
      },
    });
  }

  /**
   * Desconecta a instância (logout)
   */
  async logout(): Promise<any> {
    return this.request('DELETE', `/instance/logout/${this.instanceName}`);
  }

  /**
   * Reinicia a instância
   */
  async restart(): Promise<any> {
    return this.request('PUT', `/instance/restart/${this.instanceName}`);
  }
}
