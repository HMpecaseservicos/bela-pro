/**
 * Notification Queue Service
 * 
 * Serviço para enfileirar notificações WhatsApp.
 * Usado pelo AppointmentNotificationService para publicar jobs.
 * 
 * @module notification-queue
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { 
  NOTIFICATION_QUEUE_NAME, 
  NotificationJobData,
} from './notification-queue.types';

@Injectable()
export class NotificationQueueService implements OnModuleInit {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE_NAME)
    private readonly notificationQueue: Queue<NotificationJobData>,
  ) {}

  async onModuleInit() {
    this.logger.log(`📬 NotificationQueueService inicializado | queue=${NOTIFICATION_QUEUE_NAME}`);
    
    // Log info da fila
    const counts = await this.notificationQueue.getJobCounts();
    this.logger.log(`📊 Estado da fila: ${JSON.stringify(counts)}`);
  }

  /**
   * Enfileira uma notificação para envio
   * 
   * @param data Dados da notificação
   * @returns Job ID
   */
  async enqueue(data: Omit<NotificationJobData, 'createdAt'>): Promise<string> {
    const jobData: NotificationJobData = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    const jobName = `notify:${data.templateKey}:${data.workspaceId}`;
    
    const job = await this.notificationQueue.add(jobName, jobData, {
      // Configuração de retry
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 10000, // 10s, 20s, 40s, 80s, 160s
      },
      // Remove jobs completados após 1 hora
      removeOnComplete: {
        age: 3600, // 1 hora em segundos
        count: 1000, // Máximo 1000 jobs completados
      },
      // Mantém jobs falhados por 24 horas
      removeOnFail: {
        age: 86400, // 24 horas
      },
    });

    this.logger.log(
      `📥 [QUEUE] Job enfileirado | id=${job.id} name=${jobName} ws=${data.workspaceId} phone=${data.toPhone} template=${data.templateKey}`
    );

    return job.id || 'unknown';
  }

  /**
   * Retorna estatísticas da fila
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await this.notificationQueue.getJobCounts();
    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Retorna jobs falhados recentes
   */
  async getFailedJobs(limit = 10): Promise<Array<{
    id: string;
    data: NotificationJobData;
    failedReason: string;
    attemptsMade: number;
  }>> {
    const jobs = await this.notificationQueue.getFailed(0, limit);
    return jobs.map(job => ({
      id: job.id || 'unknown',
      data: job.data,
      failedReason: job.failedReason || 'Unknown',
      attemptsMade: job.attemptsMade,
    }));
  }
}
