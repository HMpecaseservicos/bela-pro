/**
 * Appointment Notification Service
 * 
 * Responsável por enfileirar notificações automáticas via WhatsApp
 * quando eventos de agendamento ocorrem.
 * 
 * ARQUITETURA:
 * - Este serviço NÃO envia diretamente
 * - Enfileira jobs no Redis (BullMQ)
 * - Worker separado (NotificationQueueProcessor) processa e envia
 * - Isso garante resiliência em ambiente multi-instância (Railway)
 * 
 * Eventos suportados:
 * - APPOINTMENT_CREATED: Quando agendamento é criado (público)
 * - APPOINTMENT_CONFIRMED: Quando agendamento é confirmado
 * - APPOINTMENT_CANCELLED: Quando agendamento é cancelado
 * - APPOINTMENT_REMINDER: Lembrete antes do agendamento
 * 
 * @module appointments
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueueService } from '../notification-queue/notification-queue.service';
import { BotTemplateKey } from '../chatbot/whatsapp-bot.service';

export interface AppointmentNotificationData {
  appointmentId: string;
  workspaceId: string;
  clientPhone: string;
  clientName: string;
  serviceName: string;
  startAt: Date;
}

/**
 * Mapeamento de eventos para templates do bot
 */
const EVENT_TO_TEMPLATE: Record<string, string> = {
  'APPOINTMENT_CREATED': BotTemplateKey.NOTIFY_APPOINTMENT_CREATED,
  'APPOINTMENT_CONFIRMED': BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED,
  'APPOINTMENT_CANCELLED': BotTemplateKey.NOTIFY_APPOINTMENT_CANCELLED,
  'APPOINTMENT_REMINDER': BotTemplateKey.NOTIFY_APPOINTMENT_REMINDER,
};

@Injectable()
export class AppointmentNotificationService {
  private readonly logger = new Logger(AppointmentNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationQueue: NotificationQueueService,
  ) {
    this.logger.log('📬 AppointmentNotificationService inicializado com fila');
  }

  /**
   * Enfileira notificação de agendamento criado
   */
  async notifyAppointmentCreated(data: AppointmentNotificationData): Promise<string> {
    return this.enqueueNotification(data, 'APPOINTMENT_CREATED');
  }

  /**
   * Enfileira notificação de agendamento confirmado
   */
  async notifyAppointmentConfirmed(data: AppointmentNotificationData): Promise<string> {
    return this.enqueueNotification(data, 'APPOINTMENT_CONFIRMED');
  }

  /**
   * Enfileira notificação de agendamento cancelado
   */
  async notifyAppointmentCancelled(data: AppointmentNotificationData): Promise<string> {
    return this.enqueueNotification(data, 'APPOINTMENT_CANCELLED');
  }

  /**
   * Enfileira notificação de lembrete
   */
  async notifyAppointmentReminder(data: AppointmentNotificationData): Promise<string> {
    return this.enqueueNotification(data, 'APPOINTMENT_REMINDER');
  }

  /**
   * Enfileira notificação na fila Redis
   */
  private async enqueueNotification(
    data: AppointmentNotificationData,
    eventType: string,
  ): Promise<string> {
    const { workspaceId, appointmentId, clientPhone, clientName, serviceName, startAt } = data;
    const templateKey = EVENT_TO_TEMPLATE[eventType] || BotTemplateKey.NOTIFY_APPOINTMENT_CONFIRMED;

    this.logger.log(
      `📤 [${workspaceId}] Enfileirando notificação ${eventType} | ` +
      `appt=${appointmentId} phone=${clientPhone} template=${templateKey}`
    );

    try {
      // Buscar dados do workspace
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, brandName: true },
      });

      if (!workspace) {
        this.logger.warn(`⚠️ [${workspaceId}] Workspace não encontrado para notificação`);
        return 'WORKSPACE_NOT_FOUND';
      }

      // Formatar data e hora com timezone do Brasil
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

      // Normalizar telefone para formato WhatsApp
      const phoneNormalized = clientPhone.replace(/\D/g, '');
      const phoneWhatsApp = phoneNormalized.startsWith('55') 
        ? phoneNormalized 
        : `55${phoneNormalized}`;

      // Variáveis para o template
      const variables = {
        clientName,
        serviceName,
        date,
        time,
        workspaceName: workspace.brandName || workspace.name,
      };

      // Enfileirar no Redis
      const jobId = await this.notificationQueue.enqueue({
        workspaceId,
        appointmentId,
        toPhone: phoneWhatsApp,
        templateKey,
        variables,
      });

      this.logger.log(
        `✅ [${workspaceId}] Notificação enfileirada | ` +
        `jobId=${jobId} event=${eventType} phone=${phoneWhatsApp}`
      );

      return jobId;

    } catch (error) {
      this.logger.error(
        `❌ [${workspaceId}] Erro ao enfileirar notificação ${eventType}: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Extrai dados do agendamento para notificação
   * Útil para chamar a partir do ID do agendamento
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

    if (!appointment) {
      this.logger.warn(`⚠️ Agendamento ${appointmentId} não encontrado`);
      return null;
    }

    const serviceName = appointment.services
      .map(s => s.service?.name)
      .filter(Boolean)
      .join(', ') || 'Serviço';

    return {
      appointmentId: appointment.id,
      workspaceId: appointment.workspaceId,
      clientPhone: appointment.client.phoneE164,
      clientName: appointment.client.name,
      serviceName,
      startAt: appointment.startAt,
    };
  }

  /**
   * Retorna estatísticas da fila de notificações
   */
  async getQueueStats() {
    return this.notificationQueue.getStats();
  }

  /**
   * Retorna jobs falhados recentes
   */
  async getFailedJobs(limit = 10) {
    return this.notificationQueue.getFailedJobs(limit);
  }
}
