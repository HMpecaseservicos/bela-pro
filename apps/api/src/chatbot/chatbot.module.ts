import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { WhatsAppService } from './whatsapp.service';
import { StateMachineService } from './state-machine.service';
import { EvolutionApiService } from './evolution-api.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatUsageModule } from '../chat-usage/chat-usage.module';

/**
 * ChatbotModule
 * 
 * Módulo do chatbot WhatsApp BELA PRO.
 * 
 * Funcionalidades:
 * - Webhook para WhatsApp Cloud API
 * - Webhook para Evolution API
 * - State Machine para fluxo de agendamento
 * - Integração com billing (ChatUsageService)
 * - Handoff para atendimento humano
 * 
 * Endpoints WhatsApp Cloud API:
 * - GET  /chatbot/webhook - Verificação WhatsApp
 * - POST /chatbot/webhook - Receber mensagens
 * 
 * Endpoints Evolution API:
 * - POST /chatbot/evolution/webhook - Receber mensagens
 * - GET  /chatbot/evolution/status - Status conexão
 * - GET  /chatbot/evolution/qrcode - QR Code para conectar
 * - POST /chatbot/evolution/configure-webhook - Configurar webhook
 * 
 * Endpoints Admin:
 * - GET  /chatbot/:workspaceId/conversations - Listar conversas
 * - GET  /chatbot/:workspaceId/conversation/:id - Detalhes conversa
 * - POST /chatbot/:workspaceId/conversation/:id/handoff - Toggle handoff
 * - POST /chatbot/:workspaceId/conversation/:id/message - Enviar mensagem
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ChatUsageModule,
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    WhatsAppService,
    StateMachineService,
    EvolutionApiService,
  ],
  exports: [ChatbotService, WhatsAppService, EvolutionApiService],
})
export class ChatbotModule {}
