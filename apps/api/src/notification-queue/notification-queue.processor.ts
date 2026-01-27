/**
 * Notification Queue Processor
 * 
 * Worker que processa jobs de notificação WhatsApp.
 * Consome da fila e envia via WhatsAppSessionManager.
 * 
 * Características:
 * - Retry automático com backoff exponencial
 * - Logs estruturados para rastreamento
 * - Verifica estado da sessão antes de enviar
 * - Auto-cria templates se não existirem
 * 
 * @module notification-queue
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppSessionManager } from '../chatbot/whatsapp-session.manager';
import { WhatsAppSessionState } from '../chatbot/whatsapp.types';
import { BOT_TEMPLATE_DEFAULTS, BotTemplateKey } from '../chatbot/whatsapp-bot.service';
import { renderTemplate } from '../message-templates/template-renderer';
import { 
  NOTIFICATION_QUEUE_NAME, 
  NotificationJobData, 
  NotificationJobResult,
  NotificationStatus,
} from './notification-queue.types';

@Processor(NOTIFICATION_QUEUE_NAME)
export class NotificationQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionManager: WhatsAppSessionManager,
  ) {
    super();
    this.logger.log('🚀 NotificationQueueProcessor inicializado');
  }

  /**
   * Processa um job de notificação
   */
  async process(job: Job<NotificationJobData>): Promise<NotificationJobResult> {
    const { workspaceId, appointmentId, toPhone, templateKey, variables, createdAt } = job.data;
    const attempt = job.attemptsMade + 1;
    const jobId = job.id || 'unknown';
    
    const logContext = {
      jobId,
      workspaceId,
      appointmentId: appointmentId || 'N/A',
      toPhone,
      templateKey,
      attempt,
      createdAt,
    };

    this.logger.log(`📤 [JOB ${jobId}] Processando notificação | ${JSON.stringify(logContext)}`);

    try {
      // 1. Verificar sessão WhatsApp
      const sessionInfo = this.sessionManager.getSessionInfo(workspaceId);
      
      if (!sessionInfo || sessionInfo.state !== WhatsAppSessionState.CONNECTED) {
        const state = sessionInfo?.state || 'NO_SESSION';
        this.logger.warn(
          `⚠️ [JOB ${jobId}] Sessão não conectada: ${state} | ws=${workspaceId}`
        );
        
        // Joga erro para retry
        throw new Error(`SESSION_NOT_CONNECTED: ${state}`);
      }

      this.logger.log(`✅ [JOB ${jobId}] Sessão conectada | ws=${workspaceId}`);

      // 2. Buscar ou criar template
      const templateResult = await this.getOrCreateTemplate(workspaceId, templateKey);
      
      if (!templateResult.enabled) {
        this.logger.warn(
          `🚫 [JOB ${jobId}] Template desabilitado: ${templateKey} | ws=${workspaceId}`
        );
        return {
          success: false,
          workspaceId,
          toPhone,
          templateKey,
          error: NotificationStatus.TEMPLATE_DISABLED,
        };
      }

      // 3. Renderizar mensagem
      const message = renderTemplate(templateResult.content, variables);
      this.logger.log(
        `📝 [JOB ${jobId}] Template renderizado | preview: "${message.substring(0, 50)}..."`
      );

      // 4. Enviar via SessionManager
      const sent = await this.sessionManager.sendMessage(workspaceId, toPhone, message);

      if (sent) {
        this.logger.log(
          `✅ [JOB ${jobId}] Notificação enviada com sucesso | phone=${toPhone} ws=${workspaceId}`
        );
        return {
          success: true,
          workspaceId,
          toPhone,
          templateKey,
          sentAt: new Date().toISOString(),
        };
      }

      // Falha no envio (mas sessão estava ok)
      this.logger.warn(
        `❌ [JOB ${jobId}] sendMessage retornou false | phone=${toPhone} ws=${workspaceId}`
      );
      throw new Error('SEND_MESSAGE_FAILED');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ [JOB ${jobId}] Erro ao processar: ${errorMsg} | attempt=${attempt} | ${JSON.stringify(logContext)}`
      );
      throw error; // Re-throw para BullMQ fazer retry
    }
  }

  /**
   * Busca template do banco ou cria com conteúdo padrão
   */
  private async getOrCreateTemplate(
    workspaceId: string, 
    templateKey: string
  ): Promise<{ content: string; enabled: boolean }> {
    // Buscar no banco
    let template = await this.prisma.chatbotTemplate.findFirst({
      where: { workspaceId, key: templateKey },
      select: { content: true, isActive: true },
    });

    // Se não existe, criar com padrão
    if (!template) {
      const defaultConfig = BOT_TEMPLATE_DEFAULTS[templateKey];
      
      if (!defaultConfig) {
        this.logger.error(`Template ${templateKey} não tem default configurado!`);
        return { content: `[Template ${templateKey} não configurado]`, enabled: true };
      }

      this.logger.log(`🔧 Auto-criando template ${templateKey} para workspace ${workspaceId}`);
      
      template = await this.prisma.chatbotTemplate.create({
        data: {
          workspaceId,
          key: templateKey,
          content: defaultConfig.content,
          isActive: true,
        },
        select: { content: true, isActive: true },
      });
    }

    return {
      content: template.content,
      enabled: template.isActive,
    };
  }

  /**
   * Eventos do Worker
   */
  @OnWorkerEvent('completed')
  onCompleted(job: Job<NotificationJobData>, result: NotificationJobResult) {
    this.logger.log(
      `✅ [JOB ${job.id}] Completed | success=${result.success} | phone=${result.toPhone}`
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData>, error: Error) {
    const { workspaceId, toPhone, templateKey, appointmentId } = job.data;
    this.logger.error(
      `❌ [JOB ${job.id}] Failed after ${job.attemptsMade} attempts | ` +
      `error=${error.message} | ws=${workspaceId} phone=${toPhone} template=${templateKey} appt=${appointmentId || 'N/A'}`
    );
  }

  @OnWorkerEvent('error')
  onError(error: Error) {
    this.logger.error(`🔥 Worker error: ${error.message}`);
  }
}
