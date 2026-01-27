/**
 * Notification Queue Service
 * 
 * Serviço para enfileirar/enviar notificações WhatsApp.
 * 
 * MODOS DE OPERAÇÃO:
 * 1. COM Redis: Enfileira no BullMQ para processamento assíncrono
 * 2. SEM Redis: Envia diretamente via WhatsAppSessionManager
 * 
 * @module notification-queue
 */

import { Injectable, Logger, OnModuleInit, Inject, Optional, forwardRef } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppSessionManager } from '../chatbot/whatsapp-session.manager';
import { WhatsAppSessionState } from '../chatbot/whatsapp.types';
import { BOT_TEMPLATE_DEFAULTS } from '../chatbot/whatsapp-bot.service';
import { renderTemplate } from '../message-templates/template-renderer';
import { 
  NOTIFICATION_QUEUE_NAME, 
  NotificationJobData,
} from './notification-queue.types';

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);
  private queue: Queue<NotificationJobData> | null = null;
  private redisEnabled = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => WhatsAppSessionManager))
    private readonly sessionManager: WhatsAppSessionManager,
    @Optional() @Inject('REDIS_ENABLED') 
    private readonly redisEnabledFlag?: boolean,
  ) {
    this.redisEnabled = this.redisEnabledFlag === true;
  }

  async onModuleInit() {
    if (this.redisEnabled) {
      try {
        // Injeta a fila dinamicamente se Redis estiver habilitado
        const { InjectQueue } = require('@nestjs/bullmq');
        // A fila será injetada pelo BullModule se configurado
        this.logger.log(`📬 NotificationQueueService inicializado COM Redis (fila habilitada)`);
      } catch {
        this.redisEnabled = false;
        this.logger.warn('⚠️ Falha ao configurar fila Redis, usando modo direto');
      }
    } else {
      this.logger.log('📬 NotificationQueueService inicializado SEM Redis (envio direto)');
    }
  }

  /**
   * Enfileira ou envia diretamente uma notificação
   * 
   * @param data Dados da notificação
   * @returns Job ID ou 'DIRECT_SEND'
   */
  async enqueue(data: Omit<NotificationJobData, 'createdAt'>): Promise<string> {
    const jobData: NotificationJobData = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    this.logger.log(
      `📤 [${data.workspaceId}] Notificação | phone=${data.toPhone} template=${data.templateKey}`
    );

    // Se Redis está habilitado e a fila existe, usa ela
    if (this.redisEnabled && this.queue) {
      return this.enqueueToRedis(jobData);
    }

    // Senão, envia diretamente
    return this.sendDirectly(jobData);
  }

  /**
   * Enfileira no Redis (modo com fila)
   */
  private async enqueueToRedis(data: NotificationJobData): Promise<string> {
    const jobName = `notify:${data.templateKey}:${data.workspaceId}`;
    
    const job = await this.queue!.add(jobName, data, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 10000,
      },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400 },
    });

    this.logger.log(
      `✅ [${data.workspaceId}] Job enfileirado | id=${job.id} phone=${data.toPhone}`
    );

    return job.id || 'unknown';
  }

  /**
   * Envia diretamente via WhatsApp (modo sem fila)
   */
  private async sendDirectly(data: NotificationJobData): Promise<string> {
    const { workspaceId, toPhone, templateKey, variables } = data;

    try {
      // Verificar sessão
      const sessionInfo = this.sessionManager.getSessionInfo(workspaceId);
      
      if (!sessionInfo || sessionInfo.state !== WhatsAppSessionState.CONNECTED) {
        this.logger.warn(
          `⚠️ [${workspaceId}] Sessão não conectada (${sessionInfo?.state || 'NO_SESSION'}) - notificação não enviada`
        );
        return 'SESSION_NOT_CONNECTED';
      }

      // Buscar ou criar template
      let template = await this.prisma.chatbotTemplate.findFirst({
        where: { workspaceId, key: templateKey },
        select: { content: true, isActive: true },
      });

      if (!template) {
        const defaultConfig = BOT_TEMPLATE_DEFAULTS[templateKey];
        if (defaultConfig) {
          template = await this.prisma.chatbotTemplate.create({
            data: {
              workspaceId,
              key: templateKey,
              content: defaultConfig.content,
              isActive: true,
            },
            select: { content: true, isActive: true },
          });
          this.logger.log(`🔧 [${workspaceId}] Template ${templateKey} auto-criado`);
        }
      }

      if (!template) {
        this.logger.error(`❌ [${workspaceId}] Template ${templateKey} não encontrado`);
        return 'TEMPLATE_NOT_FOUND';
      }

      if (!template.isActive) {
        this.logger.warn(`🚫 [${workspaceId}] Template ${templateKey} desabilitado`);
        return 'TEMPLATE_DISABLED';
      }

      // Renderizar mensagem
      const message = renderTemplate(template.content, variables);

      // Enviar
      const sent = await this.sessionManager.sendMessage(workspaceId, toPhone, message);

      if (sent) {
        this.logger.log(
          `✅ [${workspaceId}] Notificação enviada | phone=${toPhone} template=${templateKey}`
        );
        return 'DIRECT_SENT';
      } else {
        this.logger.warn(
          `❌ [${workspaceId}] Falha ao enviar | phone=${toPhone}`
        );
        return 'SEND_FAILED';
      }

    } catch (error) {
      this.logger.error(
        `❌ [${workspaceId}] Erro ao enviar notificação: ${error}`
      );
      return 'ERROR';
    }
  }

  /**
   * Retorna estatísticas da fila (apenas se Redis habilitado)
   */
  async getStats(): Promise<{
    mode: string;
    waiting?: number;
    active?: number;
    completed?: number;
    failed?: number;
  }> {
    if (!this.redisEnabled || !this.queue) {
      return { mode: 'direct' };
    }

    const counts = await this.queue.getJobCounts();
    return {
      mode: 'queue',
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
    };
  }

  /**
   * Retorna jobs falhados (apenas se Redis habilitado)
   */
  async getFailedJobs(limit = 10): Promise<Array<{
    id: string;
    data: NotificationJobData;
    failedReason: string;
  }>> {
    if (!this.redisEnabled || !this.queue) {
      return [];
    }

    const jobs = await this.queue.getFailed(0, limit);
    return jobs.map(job => ({
      id: job.id || 'unknown',
      data: job.data,
      failedReason: job.failedReason || 'Unknown',
    }));
  }

  /**
   * Define a fila (chamado pelo módulo quando Redis está habilitado)
   */
  setQueue(queue: Queue<NotificationJobData>) {
    this.queue = queue;
    this.redisEnabled = true;
    this.logger.log('📬 Fila Redis configurada');
  }
}
