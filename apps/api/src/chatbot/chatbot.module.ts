import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { WhatsAppService } from './whatsapp.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * ChatbotModule
 * 
 * Módulo do chatbot BELA PRO.
 * 
 * Nota: Evolution API foi removida. WhatsApp Cloud API será implementado futuramente.
 * 
 * Endpoints ativos (stubs):
 * - GET  /chatbot/health - Health check
 * - GET  /chatbot/webhook - Verificação WhatsApp (para futuro)
 * - POST /chatbot/webhook - Receber mensagens (stub)
 * - GET  /chatbot/whatsapp/status - Status (retorna 'disabled')
 * - POST /chatbot/whatsapp/qrcode - QR Code (retorna 'em breve')
 * 
 * @version 2.0.0 - Evolution removido
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [ChatbotController],
  providers: [
    WhatsAppService,
  ],
  exports: [WhatsAppService],
})
export class ChatbotModule {}
