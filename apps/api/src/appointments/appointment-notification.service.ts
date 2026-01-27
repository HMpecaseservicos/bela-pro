/**
 * Appointment Notification Service
 * 
 * Responsável por enviar notificações automáticas via WhatsApp
 * quando eventos de agendamento ocorrem.
 * 
 * Eventos suportados:
 * - APPOINTMENT_CREATED: Quando agendamento é criado (público)
 * - APPOINTMENT_CONFIRMED: Quando agendamento é confirmado (admin ou atualização)
 * - APPOINTMENT_CANCELLED: Quando agendamento é cancelado
 * 
 * @module appointments
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppBotService } from '../chatbot/whatsapp-bot.service';
import { MessageEventType } from '../message-templates/message-events';

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
    private readonly whatsAppBotService: WhatsAppBotService,
  ) {}

  /**
   * Envia notificação de agendamento criado
   */
  async notifyAppointmentCreated(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, MessageEventType.APPOINTMENT_CREATED);
  }

  /**
   * Envia notificação de agendamento confirmado
   */
  async notifyAppointmentConfirmed(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, MessageEventType.APPOINTMENT_CONFIRMED);
  }

  /**
   * Envia notificação de agendamento cancelado
   */
  async notifyAppointmentCancelled(data: AppointmentNotificationData): Promise<boolean> {
    return this.sendNotification(data, MessageEventType.APPOINTMENT_CANCELLED);
  }

  /**
   * Envia notificação genérica
   */
  private async sendNotification(
    data: AppointmentNotificationData,
    eventType: MessageEventType,
  ): Promise<boolean> {
    const { workspaceId, clientPhone, clientName, serviceName, startAt } = data;

    try {
      // Buscar dados do workspace
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, brandName: true },
      });

      if (!workspace) {
        this.logger.warn(`[${workspaceId}] Workspace não encontrado para notificação`);
        return false;
      }

      // Formatar data e hora
      const date = startAt.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      });
      const time = startAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      // Normalizar telefone para formato WhatsApp
      // Banco salva: 556699880161
      // WhatsApp precisa: 556699880161 (sem +)
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

      this.logger.log(
        `[${workspaceId}] Enviando notificação ${eventType} para ${phoneWhatsApp}: ${clientName}, ${serviceName}, ${date} ${time}`
      );

      // Usar sendProactiveMessage do WhatsAppBotService
      const sent = await this.whatsAppBotService.sendProactiveMessage(
        workspaceId,
        phoneWhatsApp,
        eventType,
        variables,
      );

      if (sent) {
        this.logger.log(`[${workspaceId}] Notificação ${eventType} enviada com sucesso para ${phoneWhatsApp}`);
      } else {
        this.logger.warn(`[${workspaceId}] Falha ao enviar notificação ${eventType} para ${phoneWhatsApp}`);
      }

      return sent;
    } catch (error) {
      this.logger.error(
        `[${workspaceId}] Erro ao enviar notificação ${eventType}: ${error}`,
      );
      return false;
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
      this.logger.warn(`Agendamento ${appointmentId} não encontrado`);
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
}
