/**
 * Chatbot Controller
 * 
 * Endpoints REST para gerenciar bot WhatsApp.
 * 
 * Endpoints:
 * - GET    /chatbot/health              - Health check
 * - GET    /chatbot/whatsapp/status     - Status da conexão
 * - POST   /chatbot/whatsapp/connect    - Iniciar conexão (auto-cria templates)
 * - GET    /chatbot/whatsapp/qrcode     - Obter QR Code
 * - POST   /chatbot/whatsapp/disconnect - Desconectar
 * - GET    /chatbot/templates           - Listar templates do bot
 * - PUT    /chatbot/templates/:key      - Atualizar template
 * - DELETE /chatbot/templates/:key      - Resetar template (volta ao padrão)
 * - POST   /chatbot/templates/init      - Inicializar todos os templates padrão
 * 
 * IMPORTANTE:
 * - Templates do BOT (ChatbotTemplate) são separados de templates manuais (MessageTemplate)
 * - O bot usa SOMENTE ChatbotTemplate com chaves BOT_*
 * 
 * @module chatbot
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppSessionManager } from './whatsapp-session.manager';
import { WhatsAppBotService, BotTemplateKey, BOT_TEMPLATE_DEFAULTS } from './whatsapp-bot.service';
import { PrismaService } from '../prisma/prisma.service';
import { 
  WhatsAppStatusResponse, 
  WhatsAppQrCodeResponse,
  WhatsAppConnectResponse,
  WhatsAppDisconnectResponse,
  WhatsAppSessionState,
} from './whatsapp.types';

interface AuthenticatedRequest {
  user: {
    userId: string;
    workspaceId: string;
    role: string;
  };
}

@Controller('api/v1/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly sessionManager: WhatsAppSessionManager,
    private readonly botService: WhatsAppBotService,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  @Get('health')
  healthCheck() {
    return { 
      status: 'ok', 
      module: 'chatbot',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
    };
  }

  // ==========================================================================
  // WHATSAPP STATUS
  // ==========================================================================

  /**
   * Retorna status da conexão WhatsApp do workspace
   */
  @Get('whatsapp/status')
  @UseGuards(JwtAuthGuard)
  getStatus(@Req() req: AuthenticatedRequest): WhatsAppStatusResponse {
    const { workspaceId } = req.user;
    
    const info = this.sessionManager.getSessionInfo(workspaceId);

    return {
      success: true,
      data: {
        state: info.state,
        connectedPhone: info.connectedPhone,
        connectedAt: info.connectedAt?.toISOString() || null,
        qrCode: info.state === WhatsAppSessionState.QR_PENDING ? info.qrCode : null,
      },
    };
  }

  // ==========================================================================
  // CONNECT
  // ==========================================================================

  /**
   * Inicia conexão WhatsApp (gera QR Code)
   * Auto-cria templates padrão do bot se não existirem
   */
  @Post('whatsapp/connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async connect(@Req() req: AuthenticatedRequest): Promise<WhatsAppConnectResponse> {
    const { workspaceId } = req.user;

    this.logger.log(`[${workspaceId}] Solicitação de conexão WhatsApp`);

    try {
      // Auto-criar templates padrão se não existirem
      const hasTemplates = await this.botService.hasTemplatesConfigured(workspaceId);
      if (!hasTemplates) {
        this.logger.log(`[${workspaceId}] Workspace sem templates - criando padrões`);
        await this.botService.createDefaultTemplates(workspaceId);
      }

      const info = await this.sessionManager.startSession(workspaceId);

      return {
        success: true,
        message: info.state === WhatsAppSessionState.CONNECTED 
          ? 'WhatsApp já está conectado'
          : 'Sessão iniciada. Aguarde o QR Code.',
        data: {
          state: info.state,
          qrCode: info.qrCode,
        },
      };
    } catch (err) {
      this.logger.error(`[${workspaceId}] Erro ao conectar: ${err}`);
      
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao iniciar conexão',
      };
    }
  }

  // ==========================================================================
  // QR CODE
  // ==========================================================================

  /**
   * Retorna QR Code atual (se disponível)
   */
  @Get('whatsapp/qrcode')
  @UseGuards(JwtAuthGuard)
  getQrCode(@Req() req: AuthenticatedRequest): WhatsAppQrCodeResponse {
    const { workspaceId } = req.user;
    
    const info = this.sessionManager.getSessionInfo(workspaceId);

    // Se não está aguardando QR ou já conectado
    if (info.state === WhatsAppSessionState.DISCONNECTED) {
      return {
        success: false,
        data: null,
        error: 'Sessão não iniciada. Use POST /whatsapp/connect primeiro.',
      };
    }

    if (info.state === WhatsAppSessionState.CONNECTED) {
      return {
        success: true,
        data: {
          qrCode: null,
          state: info.state,
        },
      };
    }

    if (!info.qrCode) {
      return {
        success: true,
        data: {
          qrCode: null,
          state: info.state,
        },
      };
    }

    return {
      success: true,
      data: {
        qrCode: info.qrCode,
        state: info.state,
      },
    };
  }

  // ==========================================================================
  // DISCONNECT
  // ==========================================================================

  /**
   * Desconecta WhatsApp e limpa sessão
   */
  @Post('whatsapp/disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req: AuthenticatedRequest): Promise<WhatsAppDisconnectResponse> {
    const { workspaceId } = req.user;

    this.logger.log(`[${workspaceId}] Solicitação de desconexão WhatsApp`);

    try {
      await this.sessionManager.logoutSession(workspaceId);

      return {
        success: true,
        message: 'WhatsApp desconectado com sucesso',
      };
    } catch (err) {
      this.logger.error(`[${workspaceId}] Erro ao desconectar: ${err}`);
      
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Erro ao desconectar',
      };
    }
  }

  // ==========================================================================
  // BOT TEMPLATES (Admin configura mensagens do bot)
  // IMPORTANTE: Estes são templates do BOT, separados de templates manuais
  // ==========================================================================

  /**
   * Lista todas as templates do bot com valores atuais
   */
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  async listTemplates(@Req() req: AuthenticatedRequest) {
    const { workspaceId } = req.user;

    // Busca templates do banco
    const dbTemplates = await this.prisma.chatbotTemplate.findMany({
      where: { workspaceId, isActive: true },
      select: { key: true, content: true },
    });

    const dbMap = new Map(dbTemplates.map((t) => [t.key, t.content]));

    // Monta lista com todas as templates + valores atuais
    const templates = Object.entries(BOT_TEMPLATE_DEFAULTS).map(([key, meta]) => ({
      key,
      label: meta.label,
      description: meta.description,
      defaultContent: meta.content,
      currentContent: dbMap.get(key) || meta.content,
      isConfigured: dbMap.has(key),
    }));

    return {
      success: true,
      data: templates,
      meta: {
        total: templates.length,
        configured: dbTemplates.length,
        info: 'Templates do Bot WhatsApp - Configure as mensagens automáticas do seu bot',
      },
    };
  }

  /**
   * Inicializa/reseta TODOS os templates para valores padrão
   */
  @Post('templates/init')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async initTemplates(@Req() req: AuthenticatedRequest) {
    const { workspaceId } = req.user;

    this.logger.log(`[${workspaceId}] Inicializando templates do bot`);

    const created = await this.botService.createDefaultTemplates(workspaceId);

    return {
      success: true,
      message: `${created} templates criados/atualizados`,
      data: { templatesCreated: created },
    };
  }

  /**
   * Atualiza uma template específica
   */
  @Put('templates/:key')
  @UseGuards(JwtAuthGuard)
  async updateTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('key') key: string,
    @Body() body: { content: string },
  ) {
    const { workspaceId } = req.user;

    // Valida se a key existe
    if (!Object.values(BotTemplateKey).includes(key as BotTemplateKey)) {
      return {
        success: false,
        message: `Template key inválida: ${key}. Keys válidas: ${Object.values(BotTemplateKey).join(', ')}`,
      };
    }

    // Upsert: atualiza se existe, cria se não
    const template = await this.prisma.chatbotTemplate.upsert({
      where: {
        workspaceId_key: {
          workspaceId,
          key,
        },
      },
      update: {
        content: body.content,
        isActive: true,
      },
      create: {
        workspaceId,
        key,
        content: body.content,
        isActive: true,
      },
    });

    this.logger.log(`[${workspaceId}] Template ${key} atualizada`);

    return {
      success: true,
      data: {
        key: template.key,
        content: template.content,
      },
    };
  }

  /**
   * Reseta uma template para o valor padrão (remove customização)
   */
  @Delete('templates/:key')
  @UseGuards(JwtAuthGuard)
  async resetTemplate(
    @Req() req: AuthenticatedRequest,
    @Param('key') key: string,
  ) {
    const { workspaceId } = req.user;

    // Valida se a key existe
    if (!Object.values(BotTemplateKey).includes(key as BotTemplateKey)) {
      return {
        success: false,
        message: `Template key inválida: ${key}`,
      };
    }

    // Deleta a customização (volta para default)
    await this.prisma.chatbotTemplate.deleteMany({
      where: { workspaceId, key },
    });

    this.logger.log(`[${workspaceId}] Template ${key} resetada para padrão`);

    return {
      success: true,
      message: `Template ${key} resetada para valor padrão`,
    };
  }

  // ==========================================================================
  // LEGACY STUBS (compatibilidade com frontend antigo)
  // ==========================================================================

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  listConversations() {
    return {
      success: true,
      data: [],
      message: 'Em desenvolvimento - visualização de conversas em breve.',
    };
  }

  @Get('status')
  getGlobalStatus() {
    return {
      success: true,
      configured: true,
      whatsappEnabled: true,
      version: '2.0.0',
      message: 'Bot WhatsApp via QR Code',
      timestamp: new Date().toISOString(),
    };
  }
}
