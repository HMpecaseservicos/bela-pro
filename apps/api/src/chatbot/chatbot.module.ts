import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { WhatsAppService } from './whatsapp.service';
import { StateMachineService } from './state-machine.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatUsageModule } from '../chat-usage/chat-usage.module';

/**
 * ChatbotModule
 * 
 * Módulo do chatbot WhatsApp BELA PRO.
 * 
 * Funcionalidades:
 * - Webhook para WhatsApp Cloud API
 * - State Machine para fluxo de agendamento
 * - Integração com billing (ChatUsageService)
 * - Handoff para atendimento humano
 * 
 * Endpoints:
 * - GET  /chatbot/webhook - Verificação WhatsApp
 * - POST /chatbot/webhook - Receber mensagens
 * - GET  /chatbot/:workspaceId/conversations - Listar conversas
 * - GET  /chatbot/:workspaceId/conversation/:id - Detalhes conversa
 * - POST /chatbot/:workspaceId/conversation/:id/handoff - Toggle handoff
 * - POST /chatbot/:workspaceId/conversation/:id/message - Enviar mensagem
 */
@Module({
  imports: [
    PrismaModule,
    ChatUsageModule,
  ],
  controllers: [ChatbotController],
  providers: [
    ChatbotService,
    WhatsAppService,
    StateMachineService,
  ],
  exports: [ChatbotService, WhatsAppService],
})
export class ChatbotModule {}
