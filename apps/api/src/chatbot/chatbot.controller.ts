import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';

/**
 * ChatbotController
 * 
 * Endpoints do chatbot.
 * WhatsApp integration foi removida temporariamente.
 * 
 * @version 2.0.0
 * @updated 2026-01-26
 */
@Controller('api/v1/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
  ) {}

  // ==========================================================================
  // HEALTH CHECK (Público)
  // ==========================================================================

  @Get('health')
  healthCheck() {
    return { status: 'ok', module: 'chatbot', timestamp: new Date().toISOString() };
  }

  // ==========================================================================
  // WEBHOOK ENDPOINTS (Públicos) - Stub para quando WhatsApp Cloud API for implementado
  // ==========================================================================

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    this.logger.log(`[Webhook] Verificação: mode=${mode}, token=${token}`);

    if (mode === 'subscribe' && token === this.whatsappService.getWebhookVerifyToken()) {
      this.logger.log('[Webhook] Verificação bem-sucedida');
      return res.status(200).send(challenge);
    }

    this.logger.warn('[Webhook] Verificação falhou');
    return res.status(403).send('Forbidden');
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() payload: unknown) {
    this.logger.log(`[Webhook] Payload recebido (ignorado - WhatsApp desabilitado)`);
    return { status: 'received', note: 'WhatsApp integration coming soon' };
  }

  // ==========================================================================
  // WHATSAPP CONNECTION - Temporariamente desabilitado
  // ==========================================================================

  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard)
  getWhatsAppStatus() {
    return {
      success: true,
      data: {
        hasInstance: false,
        instanceName: null,
        connectionState: 'disabled',
        webhookUrl: null,
        lastConnectedAt: null,
        message: 'Integração WhatsApp em desenvolvimento. Em breve disponível com WhatsApp Cloud API.',
      },
    };
  }

  @Post('whatsapp/qrcode')
  @UseGuards(JwtAuthGuard)
  getWhatsAppQRCode() {
    return {
      success: false,
      error: 'Integração WhatsApp em desenvolvimento. Em breve disponível com WhatsApp Cloud API.',
      comingSoon: true,
    };
  }

  @Post('whatsapp/disconnect')
  @UseGuards(JwtAuthGuard)
  disconnectWhatsApp() {
    return {
      success: true,
      data: { message: 'Nenhuma conexão ativa. WhatsApp Cloud API em breve.' },
    };
  }

  // ==========================================================================
  // EVOLUTION API - Removido (stubs para compatibilidade)
  // ==========================================================================

  @Post('evolution/webhook')
  @HttpCode(HttpStatus.OK)
  handleEvolutionWebhook(@Body() payload: unknown) {
    this.logger.log('[Evolution Webhook] Ignorado - Evolution API removida');
    return { status: 'ignored', note: 'Evolution API removed' };
  }

  @Get('evolution/status')
  @UseGuards(JwtAuthGuard)
  getEvolutionStatus() {
    return { 
      success: false, 
      error: 'Evolution API foi removida. WhatsApp Cloud API em desenvolvimento.',
    };
  }

  @Get('evolution/qrcode')
  @UseGuards(JwtAuthGuard)
  getEvolutionQRCode() {
    return { 
      success: false, 
      error: 'Evolution API foi removida. WhatsApp Cloud API em desenvolvimento.',
    };
  }

  @Post('evolution/configure-webhook')
  @UseGuards(JwtAuthGuard)
  configureEvolutionWebhook() {
    return { 
      success: false, 
      error: 'Evolution API foi removida. WhatsApp Cloud API em desenvolvimento.',
    };
  }

  // ==========================================================================
  // ADMIN ENDPOINTS - Mantidos para quando WhatsApp voltar
  // ==========================================================================

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  listMyConversations() {
    return {
      success: true,
      data: [],
      message: 'Chatbot WhatsApp em desenvolvimento.',
    };
  }

  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  getMyConversation(@Param('conversationId') conversationId: string) {
    return { 
      success: false, 
      error: 'Conversa não encontrada. Chatbot WhatsApp em desenvolvimento.' 
    };
  }

  @Get(':workspaceId/conversations')
  @UseGuards(JwtAuthGuard)
  listConversations(@Param('workspaceId') workspaceId: string) {
    return {
      success: true,
      data: [],
      message: 'Chatbot WhatsApp em desenvolvimento.',
    };
  }

  @Get(':workspaceId/conversations/handoff')
  @UseGuards(JwtAuthGuard)
  listHandoffConversations(@Param('workspaceId') workspaceId: string) {
    return {
      success: true,
      data: [],
      count: 0,
      message: 'Chatbot WhatsApp em desenvolvimento.',
    };
  }

  @Get(':workspaceId/conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  getConversation(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return {
      success: false,
      error: 'Conversa não encontrada. Chatbot WhatsApp em desenvolvimento.',
    };
  }

  @Post(':workspaceId/conversation/:conversationId/handoff')
  @UseGuards(JwtAuthGuard)
  toggleHandoff(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body('isHandoff') isHandoff: boolean,
  ) {
    return {
      success: false,
      error: 'Chatbot WhatsApp em desenvolvimento.',
    };
  }

  @Post(':workspaceId/conversation/:conversationId/message')
  @UseGuards(JwtAuthGuard)
  sendMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body('text') text: string,
  ) {
    return {
      success: false,
      message: 'Chatbot WhatsApp em desenvolvimento.',
    };
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  @Get('status')
  getStatus() {
    return {
      success: true,
      configured: false,
      whatsappEnabled: false,
      message: 'WhatsApp Cloud API em desenvolvimento.',
      timestamp: new Date().toISOString(),
    };
  }
}
