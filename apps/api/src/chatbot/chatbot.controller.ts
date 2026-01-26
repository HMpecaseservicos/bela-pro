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
  Req,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatbotService } from './chatbot.service';
import { WhatsAppService } from './whatsapp.service';
import { EvolutionApiService, EvolutionWebhookPayload } from './evolution-api.service';
import { WhatsAppWebhookPayload, ChatConversationState } from './chatbot.types';

/**
 * ChatbotController
 * 
 * Endpoints para:
 * - Webhook do WhatsApp Cloud API (público)
 * - Webhook da Evolution API (público)
 * - Gerenciamento de conversas (autenticado)
 * 
 * @version 1.0.1
 * @updated 2026-01-24
 */
@Controller('api/v1/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  private getPublicBaseUrl(req: Request): string {
    const envBase = process.env.PUBLIC_API_BASE_URL;
    if (envBase && envBase.trim()) {
      return envBase.trim().replace(/\/$/, '');
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    const scheme = (proto || req.protocol || 'https').toString();

    const forwardedHost = req.headers['x-forwarded-host'];
    const host = Array.isArray(forwardedHost)
      ? forwardedHost[0]
      : (forwardedHost || req.get('host') || '').toString();

    return `${scheme}://${host}`.replace(/\/$/, '');
  }

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly whatsappService: WhatsAppService,
    private readonly evolutionApiService: EvolutionApiService,
  ) {}

  // ==========================================================================
  // HEALTH CHECK (Público)
  // ==========================================================================

  /**
   * GET /chatbot/health
   * Endpoint para verificar se o módulo chatbot está carregado
   */
  @Get('health')
  healthCheck() {
    return { status: 'ok', module: 'chatbot', timestamp: new Date().toISOString() };
  }

  // ==========================================================================
  // WEBHOOK ENDPOINTS (Públicos)
  // ==========================================================================

  /**
   * GET /chatbot/webhook
   * 
   * Verificação do webhook do WhatsApp.
   * Meta envia GET para verificar o endpoint.
   */
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

  /**
   * POST /chatbot/webhook
   * 
   * Recebe mensagens do WhatsApp.
   * Deve responder 200 rapidamente (processamento assíncrono).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: WhatsAppWebhookPayload) {
    this.logger.log(`[Webhook] Payload recebido: ${JSON.stringify(payload).slice(0, 200)}...`);

    // Processar de forma assíncrona (não bloquear resposta)
    setImmediate(() => {
      this.chatbotService.processWebhook(payload).catch(err => {
        this.logger.error(`[Webhook] Erro no processamento: ${err.message}`);
      });
    });

    // Responder imediatamente
    return { status: 'received' };
  }

  // ==========================================================================
  // EVOLUTION API WEBHOOK (Público)
  // ==========================================================================

  /**
   * POST /chatbot/evolution/webhook
   * 
   * Recebe mensagens da Evolution API.
   */
  @Post('evolution/webhook')
  @HttpCode(HttpStatus.OK)
  async handleEvolutionWebhook(@Body() payload: EvolutionWebhookPayload) {
    this.logger.log(`[Evolution Webhook] Evento: ${payload.event}, Instance: ${payload.instance}`);

    // Processar de forma assíncrona
    setImmediate(() => {
      this.chatbotService.processEvolutionWebhook(payload).catch(err => {
        this.logger.error(`[Evolution Webhook] Erro: ${err.message}`);
      });
    });

    return { status: 'received' };
  }

  // ==========================================================================
  // WHATSAPP CONNECTION (Autenticado - fluxo simplificado)
  // ==========================================================================

  /**
   * GET /chatbot/whatsapp/status
   * Retorna status da conexão do WhatsApp (Evolution) do workspace do JWT.
   */
  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard)
  async getWhatsAppStatus(@Req() req: any) {
    const workspaceId = req.user.workspaceId as string;
    const data = await this.chatbotService.getWhatsAppConnectionStatus(workspaceId);
    return { success: true, data };
  }

  /**
   * POST /chatbot/whatsapp/qrcode
   * Gera/retorna QRCode (e configura webhook) para conectar o WhatsApp no workspace do JWT.
   */
  @Post('whatsapp/qrcode')
  @UseGuards(JwtAuthGuard)
  async getWhatsAppQRCode(@Req() req: any) {
    const workspaceId = req.user.workspaceId as string;
    const baseUrl = this.getPublicBaseUrl(req as Request);
    const webhookUrl = `${baseUrl}/api/v1/chatbot/evolution/webhook`;

    try {
      const qr = await this.chatbotService.getWhatsAppQrCode(workspaceId, webhookUrl);
      return { success: true, data: qr };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar QR Code';
      throw new InternalServerErrorException(message);
    }
  }

  /**
   * POST /chatbot/whatsapp/disconnect
   * Desconecta (logout) a instância do WhatsApp do workspace do JWT.
   */
  @Post('whatsapp/disconnect')
  @UseGuards(JwtAuthGuard)
  async disconnectWhatsApp(@Req() req: any) {
    const workspaceId = req.user.workspaceId as string;
    const result = await this.chatbotService.disconnectWhatsApp(workspaceId);
    return { success: true, data: result };
  }

  /**
   * GET /chatbot/evolution/status
   * 
   * Verifica status da conexão Evolution API.
   */
  @Get('evolution/status')
  @UseGuards(JwtAuthGuard)
  async getEvolutionStatus() {
    try {
      const status = await this.evolutionApiService.getInstanceStatus();
      return { success: true, data: status };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * GET /chatbot/evolution/qrcode
   * 
   * Obtém QR Code para conectar WhatsApp.
   */
  @Get('evolution/qrcode')
  @UseGuards(JwtAuthGuard)
  async getEvolutionQRCode() {
    try {
      const qrcode = await this.evolutionApiService.getQRCode();
      return { success: true, data: qrcode };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * POST /chatbot/evolution/configure-webhook
   * 
   * Configura o webhook na Evolution API.
   */
  @Post('evolution/configure-webhook')
  @UseGuards(JwtAuthGuard)
  async configureEvolutionWebhook(@Body() body: { webhookUrl: string }) {
    try {
      const result = await this.evolutionApiService.configureWebhook(body.webhookUrl);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  // ==========================================================================
  // ADMIN ENDPOINTS (Autenticados)
  // ==========================================================================

  /**
   * GET /chatbot/conversations
   * Lista conversas do workspace do JWT.
   */
  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async listMyConversations(
    @Req() req: any,
    @Query('state') state?: string,
    @Query('handoff') handoff?: string,
    @Query('limit') limit?: string,
  ) {
    const workspaceId = req.user.workspaceId as string;

    const conversations = await this.chatbotService.listConversations(workspaceId, {
      state: state as ChatConversationState,
      isHumanHandoff: handoff === 'true' ? true : handoff === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: conversations.map(conv => ({
        id: conv.id,
        phoneE164: conv.phoneE164,
        state: conv.state,
        isHumanHandoff: conv.isHumanHandoff,
        lastMessage: conv.messages[0]?.text || null,
        lastMessageAt: conv.messages[0]?.createdAt || conv.updatedAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
    };
  }

  /**
   * GET /chatbot/conversation/:conversationId
   * Busca conversa do workspace do JWT.
   */
  @Get('conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getMyConversation(@Req() req: any, @Param('conversationId') conversationId: string) {
    const workspaceId = req.user.workspaceId as string;
    const conversation = await this.chatbotService.getConversation(conversationId);

    if (!conversation || conversation.workspaceId !== workspaceId) {
      return { success: false, error: 'Conversa não encontrada' };
    }

    return { success: true, data: conversation };
  }

  /**
   * GET /chatbot/:workspaceId/conversations
   * 
   * Lista conversas de um workspace.
   */
  @Get(':workspaceId/conversations')
  @UseGuards(JwtAuthGuard)
  async listConversations(
    @Param('workspaceId') workspaceId: string,
    @Query('state') state?: string,
    @Query('handoff') handoff?: string,
    @Query('limit') limit?: string,
  ) {
    const conversations = await this.chatbotService.listConversations(workspaceId, {
      state: state as ChatConversationState,
      isHumanHandoff: handoff === 'true' ? true : handoff === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: conversations.map(conv => ({
        id: conv.id,
        phoneE164: conv.phoneE164,
        state: conv.state,
        isHumanHandoff: conv.isHumanHandoff,
        lastMessage: conv.messages[0]?.text || null,
        lastMessageAt: conv.messages[0]?.createdAt || conv.updatedAt,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
    };
  }

  /**
   * GET /chatbot/:workspaceId/conversations/handoff
   * 
   * Lista apenas conversas aguardando atendimento humano.
   */
  @Get(':workspaceId/conversations/handoff')
  @UseGuards(JwtAuthGuard)
  async listHandoffConversations(@Param('workspaceId') workspaceId: string) {
    const conversations = await this.chatbotService.listConversations(workspaceId, {
      isHumanHandoff: true,
    });

    return {
      success: true,
      data: conversations,
      count: conversations.length,
    };
  }

  /**
   * GET /chatbot/:workspaceId/conversation/:conversationId
   * 
   * Busca conversa com histórico de mensagens.
   */
  @Get(':workspaceId/conversation/:conversationId')
  @UseGuards(JwtAuthGuard)
  async getConversation(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const conversation = await this.chatbotService.getConversation(conversationId);

    if (!conversation || conversation.workspaceId !== workspaceId) {
      return {
        success: false,
        error: 'Conversa não encontrada',
      };
    }

    return {
      success: true,
      data: conversation,
    };
  }

  /**
   * POST /chatbot/:workspaceId/conversation/:conversationId/handoff
   * 
   * Alterna modo handoff humano.
   */
  @Post(':workspaceId/conversation/:conversationId/handoff')
  @UseGuards(JwtAuthGuard)
  async toggleHandoff(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body('isHandoff') isHandoff: boolean,
  ) {
    const conversation = await this.chatbotService.setHumanHandoff(
      conversationId,
      isHandoff,
    );

    return {
      success: true,
      data: {
        id: conversation.id,
        isHumanHandoff: conversation.isHumanHandoff,
        state: conversation.state,
      },
    };
  }

  /**
   * POST /chatbot/:workspaceId/conversation/:conversationId/message
   * 
   * Envia mensagem manual (admin responde cliente).
   */
  @Post(':workspaceId/conversation/:conversationId/message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
    @Body('text') text: string,
  ) {
    const result = await this.chatbotService.sendManualMessage(conversationId, text);

    return {
      success: result.success,
      message: result.success ? 'Mensagem enviada' : 'Erro ao enviar mensagem',
    };
  }

  // ==========================================================================
  // STATUS & DEBUG
  // ==========================================================================

  /**
   * GET /chatbot/status
   * 
   * Verifica status do serviço.
   */
  @Get('status')
  getStatus() {
    return {
      success: true,
      configured: this.whatsappService.isConfigured(),
      timestamp: new Date().toISOString(),
    };
  }
}
