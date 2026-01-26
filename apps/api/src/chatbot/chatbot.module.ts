/**
 * Chatbot Module
 * 
 * Módulo do bot WhatsApp via QR Code (whatsapp-web.js).
 * 
 * Funcionalidades:
 * - Conexão via QR Code (WhatsApp Web)
 * - Uma sessão por workspace (multi-tenant)
 * - Templates de mensagem configuráveis
 * - Handlers simples para comandos básicos
 * 
 * Endpoints:
 * - GET  /chatbot/health           - Health check
 * - GET  /chatbot/whatsapp/status  - Status da conexão
 * - POST /chatbot/whatsapp/connect - Iniciar conexão
 * - GET  /chatbot/whatsapp/qrcode  - Obter QR Code
 * - POST /chatbot/whatsapp/disconnect - Desconectar
 * 
 * @version 2.0.0
 * @module chatbot
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { WhatsAppSessionManager } from './whatsapp-session.manager';
import { WhatsAppBotService } from './whatsapp-bot.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [ChatbotController],
  providers: [
    WhatsAppSessionManager,
    WhatsAppBotService,
  ],
  exports: [
    WhatsAppSessionManager,
    WhatsAppBotService,
  ],
})
export class ChatbotModule {}
