/**
 * Notification Queue Module
 * 
 * Módulo de fila de notificações WhatsApp usando BullMQ.
 * 
 * Funcionalidades:
 * - Enfileiramento de notificações
 * - Processamento com retry automático
 * - Backoff exponencial para falhas
 * - Logs estruturados
 * 
 * Requer REDIS_URL configurado.
 * 
 * @module notification-queue
 */

import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationQueueProcessor } from './notification-queue.processor';
import { NOTIFICATION_QUEUE_NAME } from './notification-queue.types';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    forwardRef(() => ChatbotModule),
    
    // Registra BullMQ com conexão Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
        
        // Parse Redis URL
        const url = new URL(redisUrl);
        
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
          },
          defaultJobOptions: {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 10000,
            },
          },
        };
      },
    }),
    
    // Registra a fila específica
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE_NAME,
    }),
  ],
  providers: [
    NotificationQueueService,
    NotificationQueueProcessor,
  ],
  exports: [
    NotificationQueueService,
  ],
})
export class NotificationQueueModule {}
