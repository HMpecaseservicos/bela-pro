/**
 * Notification Queue Module
 * 
 * Módulo de notificações WhatsApp com suporte OPCIONAL a fila Redis.
 * 
 * MODOS DE OPERAÇÃO:
 * 1. COM Redis (REDIS_URL configurado): Usa BullMQ para fila resiliente
 * 2. SEM Redis: Envia diretamente via WhatsAppSessionManager (fallback)
 * 
 * O fallback garante que notificações funcionem mesmo sem Redis,
 * mas sem retry automático em caso de falha.
 * 
 * @module notification-queue
 */

import { Module, forwardRef, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { NotificationQueueService } from './notification-queue.service';

@Module({})
export class NotificationQueueModule {
  private static readonly logger = new Logger(NotificationQueueModule.name);

  /**
   * Registra o módulo verificando se Redis está disponível
   */
  static forRoot(): DynamicModule {
    const redisUrl = process.env.REDIS_URL;
    const hasRedis = !!redisUrl && redisUrl !== 'redis://localhost:6379';

    if (hasRedis) {
      this.logger.log(`📬 Redis disponível: ${redisUrl.substring(0, 30)}...`);
      return this.withRedis();
    } else {
      this.logger.warn('⚠️ Redis não configurado - notificações serão enviadas diretamente (sem fila)');
      return this.withoutRedis();
    }
  }

  /**
   * Modo COM Redis: usa BullMQ
   */
  private static withRedis(): DynamicModule {
    // Import dinâmico para evitar erro se Redis não estiver disponível
    const { BullModule } = require('@nestjs/bullmq');
    const { NotificationQueueProcessor } = require('./notification-queue.processor');
    const { NOTIFICATION_QUEUE_NAME } = require('./notification-queue.types');

    return {
      module: NotificationQueueModule,
      imports: [
        ConfigModule,
        PrismaModule,
        forwardRef(() => ChatbotModule),
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
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
        BullModule.registerQueue({
          name: NOTIFICATION_QUEUE_NAME,
        }),
      ],
      providers: [
        NotificationQueueService,
        NotificationQueueProcessor,
        { provide: 'REDIS_ENABLED', useValue: true },
      ],
      exports: [NotificationQueueService, 'REDIS_ENABLED'],
    };
  }

  /**
   * Modo SEM Redis: usa serviço simplificado que envia diretamente
   */
  private static withoutRedis(): DynamicModule {
    return {
      module: NotificationQueueModule,
      imports: [
        ConfigModule,
        PrismaModule,
        forwardRef(() => ChatbotModule),
      ],
      providers: [
        NotificationQueueService,
        { provide: 'REDIS_ENABLED', useValue: false },
      ],
      exports: [NotificationQueueService, 'REDIS_ENABLED'],
    };
  }
}
