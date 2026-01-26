/**
 * Chatbot Controller
 * 
 * Endpoints REST para gerenciar bot WhatsApp.
 * 
 * Endpoints:
 * - GET  /chatbot/health           - Health check
 * - GET  /chatbot/whatsapp/status  - Status da conexão
 * - POST /chatbot/whatsapp/connect - Iniciar conexão
 * - GET  /chatbot/whatsapp/qrcode  - Obter QR Code
 * - POST /chatbot/whatsapp/disconnect - Desconectar
 * 
 * @module chatbot
 */

import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppSessionManager } from './whatsapp-session.manager';
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
