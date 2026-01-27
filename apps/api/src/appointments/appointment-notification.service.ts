/**
 * Appointment Notification Service - VERSÃO SIMPLES
 * 
 * Envia notificações via WhatsApp usando o MESMO SessionManager
 * que o bot usa para responder mensagens.
 * 
 * SEM filas, SEM complexidade, FUNCIONA.
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppSessionManager } from '../chatbot/whatsapp-session.manager';
import { WhatsAppSessionState } from '../chatbot/whatsapp.types';
import { BOT_TEMPLATE_DEFAULTS, BotTemplateKey } from '../chatbot/whatsapp-bot.service';
import { renderTemplate } from '../message-templates/template-renderer';

export interface AppointmentNotificationData {
  appointmentId: string;
  workspaceId: string;
  clientPhone: string;
  clientName: string;
  serviceName: string;
  startAt: Date;
}

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsAppSessionManager))
    private readonly sessionManager: WhatsAppSessionManager,
  ) {
    this.logger.log('📬 AppointmentNotificationService inicializado');
  }

  /**
   * Notifica agendamento criado (aguardando confirmação)
   */
  async notifyAppointmentCreated(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, BotTemplateKey.NOTIFY_APPOINTMENT_CREATED);
  }

  /**
   * Notifica agendamento confirmado
   */
  async notifyAppointmentConfirmed(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED);
  }

  /**
   * Notifica agendamento cancelado
   */
  async notifyAppointmentCancelled(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, BotTemplateKey.NOTIFY_APPOINTMENT_CANCELLED);
  }

  /**
   * Notifica lembrete de agendamento
   */
  async notifyAppointmentReminder(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, BotTemplateKey.NOTIFY_APPOINTMENT_REMINDER);
  }

  /**
   * Envia notificação - MÉTODO PRINCIPAL
   */
  private async sendNotification(
    data: AppointmentNotificationData,
    templateKey: string,
  ): Promise<boolean> {
    const { workspaceId, appointmentId, clientPhone, clientName, serviceName, startAt } = data;

    this.logger.log(
      `📤 [${workspaceId}] Enviando notificação ${templateKey} | ` +
      `appt=${appointmentId} phone=${clientPhone} client=${clientName}`
    );

    try {
      // 1. VERIFICAR SESSÃO WHATSAPP
      const sessionInfo = this.sessionManager.getSessionInfo(workspaceId);
      
      if (!sessionInfo || sessionInfo.state !== WhatsAppSessionState.CONNECTED) {
        this.logger.warn(
          `⚠️ [${workspaceId}] WhatsApp não conectado (${sessionInfo?.state || 'SEM_SESSÃO'}) - notificação não enviada`
        );
        return false;
      }

      this.logger.log(`✅ [${workspaceId}] Sessão WhatsApp conectada`);

      // 2. BUSCAR WORKSPACE
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, brandName: true },
      });

      if (!workspace) {
        this.logger.error(`❌ [${workspaceId}] Workspace não encontrado`);
        return false;
      }

      // 3. FORMATAR DATA/HORA (timezone Brasil)
      const brazilTz = 'America/Sao_Paulo';
      const date = startAt.toLocaleDateString('pt-BR', {
        timeZone: brazilTz,
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
      const time = startAt.toLocaleTimeString('pt-BR', {
        timeZone: brazilTz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // 4. NORMALIZAR TELEFONE
      const phoneNormalized = clientPhone.replace(/\D/g, '');
      const phoneWhatsApp = phoneNormalized.startsWith('55') 
        ? phoneNormalized 
        : `55${phoneNormalized}`;

      // 5. BUSCAR OU CRIAR TEMPLATE
      let template = await this.prisma.chatbotTemplate.findFirst({
        where: { workspaceId, key: templateKey },
        select: { content: true, isActive: true },
      });

      if (!template) {
        const defaultConfig = BOT_TEMPLATE_DEFAULTS[templateKey];
        if (defaultConfig) {
          this.logger.log(`🔧 [${workspaceId}] Criando template ${templateKey}`);
          template = await this.prisma.chatbotTemplate.create({
            data: {
              workspaceId,
              key: templateKey,
              content: defaultConfig.content,
              isActive: true,
            },
            select: { content: true, isActive: true },
          });
        } else {
          this.logger.error(`❌ [${workspaceId}] Template ${templateKey} não existe`);
          return false;
        }
      }

      if (!template.isActive) {
        this.logger.warn(`🚫 [${workspaceId}] Template ${templateKey} desabilitado`);
        return false;
      }

      // 6. RENDERIZAR MENSAGEM
      const variables = {
        clientName,
        serviceName,
        date,
        time,
        workspaceName: workspace.brandName || workspace.name,
      };
      const message = renderTemplate(template.content, variables);

      this.logger.log(`📝 [${workspaceId}] Mensagem: "${message.substring(0, 60)}..."`);

      // 7. ENVIAR VIA WHATSAPP
      const sent = await this.sessionManager.sendMessage(workspaceId, phoneWhatsApp, message);

      if (sent) {
        this.logger.log(
          `✅ [${workspaceId}] NOTIFICAÇÃO ENVIADA | phone=${phoneWhatsApp} template=${templateKey}`
        );
        return true;
      } else {
        this.logger.error(
          `❌ [${workspaceId}] Falha ao enviar | phone=${phoneWhatsApp}`
        );
        return false;
      }

    } catch (error) {
      this.logger.error(`❌ [${workspaceId}] Erro: ${error}`);
      return false;
    }
  }

  /**
   * Busca dados de um agendamento para notificação
   */
  async getAppointmentNotificationData(appointmentId: string): Promise<AppointmentNotificationData | null> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        client: true,
        services: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
    });

    if (!appointment) return null;

    return {
      appointmentId: appointment.id,
      workspaceId: appointment.workspaceId,
      clientPhone: appointment.client.phoneE164,
      clientName: appointment.client.name,
      serviceName: appointment.services.map(s => s.service?.name).filter(Boolean).join(', ') || 'Serviço',
      startAt: appointment.startAt,
    };
  }
}
