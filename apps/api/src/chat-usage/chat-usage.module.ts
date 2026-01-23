import { Module } from '@nestjs/common';
import { ChatUsageService } from './chat-usage.service';
import { ChatUsageController } from './chat-usage.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * ChatUsageModule
 * 
 * Módulo responsável pelo controle de uso de conversas por workspace.
 * Implementa billing baseado em conversas (modelo Meta).
 * 
 * Exporta ChatUsageService para ser usado pelo módulo de chatbot
 * no webhook handler.
 */
@Module({
  imports: [PrismaModule],
  controllers: [ChatUsageController],
  providers: [ChatUsageService],
  exports: [ChatUsageService], // Exportar para uso no chatbot webhook
})
export class ChatUsageModule {}
