import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentNotificationService } from './appointment-notification.service';

/**
 * Serviço de lembrete automático de agendamentos
 * Executa a cada 5 minutos e envia lembretes para agendamentos
 * que começam em aproximadamente 2 horas
 */
@Injectable()
export class AppointmentReminderService {
  private readonly logger = new Logger(AppointmentReminderService.name);

  // Horas antes do agendamento para enviar lembrete
  private readonly REMINDER_HOURS_BEFORE = 2;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: AppointmentNotificationService,
  ) {}

  /**
   * Job que roda a cada 5 minutos para enviar lembretes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendReminders() {
    this.logger.debug('🔔 Verificando agendamentos para enviar lembretes...');

    try {
      const now = new Date();
      
      // Janela: agendamentos que começam entre 1h55min e 2h05min a partir de agora
      // Isso dá uma margem de 10 minutos para o job que roda a cada 5 min
      const minTime = new Date(now.getTime() + (this.REMINDER_HOURS_BEFORE * 60 - 5) * 60 * 1000);
      const maxTime = new Date(now.getTime() + (this.REMINDER_HOURS_BEFORE * 60 + 5) * 60 * 1000);

      // Busca agendamentos CONFIRMED que:
      // - Começam dentro da janela de lembrete
      // - Ainda não receberam lembrete (reminderSentAt = null)
      const appointments = await this.prisma.appointment.findMany({
        where: {
          status: 'CONFIRMED',
          startAt: {
            gte: minTime,
            lte: maxTime,
          },
          reminderSentAt: null,
        },
        include: {
          client: true,
          workspace: true,
          services: {
            include: {
              service: true,
            },
          },
        },
      });

      if (appointments.length === 0) {
        this.logger.debug('Nenhum agendamento para lembrete neste momento');
        return;
      }

      this.logger.log(`🔔 Encontrados ${appointments.length} agendamentos para lembrete`);

      for (const appointment of appointments) {
        try {
          const serviceName = appointment.services
            .map(s => s.service?.name)
            .filter(Boolean)
            .join(', ') || 'Serviço';

          const sent = await this.notificationService.notifyAppointmentReminder({
            appointmentId: appointment.id,
            workspaceId: appointment.workspaceId,
            clientPhone: appointment.client.phoneE164,
            clientName: appointment.client.name,
            serviceName,
            startAt: appointment.startAt,
          });

          if (sent) {
            // Marca como lembrete enviado
            await this.prisma.appointment.update({
              where: { id: appointment.id },
              data: { reminderSentAt: new Date() },
            });
            
            this.logger.log(
              `✅ [${appointment.workspaceId}] Lembrete enviado para ${appointment.client.name} | ` +
              `appt=${appointment.id}`
            );
          } else {
            this.logger.warn(
              `⚠️ [${appointment.workspaceId}] Lembrete não enviado (WhatsApp desconectado?) | ` +
              `appt=${appointment.id}`
            );
          }
        } catch (err) {
          this.logger.error(
            `❌ [${appointment.workspaceId}] Erro ao enviar lembrete: ${err} | ` +
            `appt=${appointment.id}`
          );
        }
      }
    } catch (err) {
      this.logger.error(`❌ Erro no job de lembretes: ${err}`);
    }
  }
}
