/**
 * Chatbot Controller
 * 
 * Endpoints REST para gerenciar bot WhatsApp.
 * 
 * Endpoints:
 * - GET    /chatbot/health              - Health check
 * - GET    /chatbot/whatsapp/status     - Status da conexão
 * - POST   /chatbot/whatsapp/connect    - Iniciar conexão
 * - GET    /chatbot/whatsapp/qrcode     - Obter QR Code
 * - POST   /chatbot/whatsapp/disconnect - Desconectar
 * - GET    /chatbot/templates           - Listar templates do bot
 * - PUT    /chatbot/templates/:key      - Atualizar template
 * - DELETE /chatbot/templates/:key      - Resetar template (volta ao padrão)
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
import { PrismaService } from '../prisma/prisma.service';
import { BotTemplateKey } from './whatsapp-bot.service';
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

// Metadados dos templates para UI
const BOT_TEMPLATE_META: Record<string, { label: string; description: string; defaultContent: string }> = {
  [BotTemplateKey.WELCOME]: {
    label: 'Boas-vindas',
    description: 'Primeira mensagem quando cliente entra em contato',
    defaultContent: 'Olá {{clientName}}! 👋\n\nBem-vindo(a) à {{workspaceName}}!\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.MENU]: {
    label: 'Menu Principal',
    description: 'Menu de opções exibido quando cliente pede',
    defaultContent: 'Como posso ajudar?\n\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.HELP]: {
    label: 'Ajuda',
    description: 'Mensagem de ajuda',
    defaultContent: 'Precisa de ajuda? 🤔\n\nDigite o número da opção:\n1 - Agendar um serviço\n2 - Ver seus agendamentos\n3 - Falar com um atendente',
  },
  [BotTemplateKey.UNKNOWN_COMMAND]: {
    label: 'Comando não reconhecido',
    description: 'Quando o bot não entende a mensagem',
    defaultContent: 'Desculpe, não entendi. 😅\n\nDigite:\n1️⃣ Agendar\n2️⃣ Meus agendamentos\n3️⃣ Falar com atendente',
  },
  [BotTemplateKey.HUMAN_HANDOFF]: {
    label: 'Transferência para atendente',
    description: 'Quando cliente pede para falar com humano',
    defaultContent: 'Certo! Um atendente vai falar com você em breve. ⏳\n\nAguarde, por favor!',
  },
  [BotTemplateKey.BOOKING_LINK]: {
    label: 'Link de Agendamento',
    description: 'Mensagem com link para agendar',
    defaultContent: '📅 Para agendar, acesse o link:\n\n{{bookingLink}}\n\nÉ rápido e fácil! ✨',
  },
  [BotTemplateKey.NO_APPOINTMENTS]: {
    label: 'Sem Agendamentos',
    description: 'Quando cliente não tem agendamentos',
    defaultContent: 'Você não tem agendamentos futuros. 📅\n\nDigite 1 para agendar!',
  },
};

@Controller('api/v1/chatbot')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly sessionManager: WhatsAppSessionManager,
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
   */
  @Post('whatsapp/connect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async connect(@Req() req: AuthenticatedRequest): Promise<WhatsAppConnectResponse> {
    const { workspaceId } = req.user;

    this.logger.log(`[${workspaceId}] Solicitação de conexão WhatsApp`);

    try {
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
  // ==========================================================================

  /**
   * Lista todas as templates disponíveis com valores atuais
   */
  @Get('templates')
  @UseGuards(JwtAuthGuard)
  async listTemplates(@Req() req: AuthenticatedRequest) {
    const { workspaceId } = req.user;

    // Busca templates customizados no banco
    const customTemplates = await this.prisma.chatbotTemplate.findMany({
      where: { workspaceId, isActive: true },
      select: { key: true, content: true },
    });

    const customMap = new Map(customTemplates.map((t) => [t.key, t.content]));

    // Monta lista com todas as templates + valores atuais
    const templates = Object.entries(BOT_TEMPLATE_META).map(([key, meta]) => ({
      key,
      label: meta.label,
      description: meta.description,
      defaultContent: meta.defaultContent,
      currentContent: customMap.get(key) || meta.defaultContent,
      isCustomized: customMap.has(key),
    }));

    return {
      success: true,
      data: templates,
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
        message: `Template key inválida: ${key}`,
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
