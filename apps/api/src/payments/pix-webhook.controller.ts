import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus, UnauthorizedException, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import * as crypto from 'crypto';
import { Request } from 'express';

/**
 * Estrutura esperada do webhook PIX (exemplo genérico)
 * Adaptar conforme o provedor PSP usado (ex: Gerencianet, Mercado Pago, etc.)
 */
interface PixWebhookPayload {
  pix?: Array<{
    txid?: string;
    endToEndId?: string;
    valor?: string;
    horario?: string;
    pagador?: {
      nome?: string;
      cpf?: string;
    };
  }>;
  // Campos adicionais de outros provedores
  txId?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
}

@Controller('api/v1/webhooks/pix')
export class PixWebhookController {
  private readonly logger = new Logger(PixWebhookController.name);
  private readonly webhookSecret: string | undefined;
  private readonly allowedIps: string[];

  constructor(private readonly paymentsService: PaymentsService) {
    this.webhookSecret = process.env.PIX_WEBHOOK_SECRET;
    this.allowedIps = (process.env.PIX_WEBHOOK_ALLOWED_IPS || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(Boolean);

    if (!this.webhookSecret) {
      this.logger.warn('⚠️ PIX_WEBHOOK_SECRET não configurado — webhook rejeitará todas as requisições');
    }
  }

  /**
   * POST /api/v1/webhooks/pix
   * Endpoint para receber notificações de pagamento PIX
   * 
   * Segurança:
   * 1. Validação de assinatura HMAC-SHA256 (obrigatória)
   * 2. Whitelist de IPs (quando configurada)
   * 3. Validação de timestamp para replay attacks
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePixWebhook(
    @Body() payload: PixWebhookPayload,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
    @Req() req?: Request,
  ) {
    this.logger.log(`📥 Webhook PIX recebido`);

    // 1. Validar IP (quando whitelist configurada)
    if (this.allowedIps.length > 0 && req) {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress || '';
      if (!this.allowedIps.includes(clientIp)) {
        this.logger.warn(`🚫 Webhook PIX rejeitado — IP não autorizado: ${clientIp}`);
        throw new UnauthorizedException('IP não autorizado');
      }
    }

    // 2. Validar assinatura HMAC
    if (!this.validateWebhookSignature(payload, signature, timestamp)) {
      this.logger.warn('🚫 Webhook PIX rejeitado — assinatura inválida');
      throw new UnauthorizedException('Assinatura inválida');
    }

    // 3. Validar timestamp (rejeitar se > 5 min atrás — anti replay)
    if (timestamp) {
      const ts = parseInt(timestamp, 10);
      const now = Date.now();
      if (isNaN(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
        this.logger.warn('🚫 Webhook PIX rejeitado — timestamp fora da janela');
        throw new UnauthorizedException('Timestamp expirado');
      }
    }

    // Extrair txId do payload (adaptar conforme formato do PSP)
    const txId = this.extractTxId(payload);

    if (!txId) {
      this.logger.warn('⚠️ Webhook recebido sem txId identificável');
      return { received: true, processed: false, reason: 'no_txid' };
    }

    try {
      const result = await this.paymentsService.confirmByWebhook(
        txId,
        JSON.stringify(payload)
      );

      if (result.alreadyProcessed) {
        this.logger.log(`✅ Pagamento ${result.paymentId} já processado anteriormente`);
      } else {
        this.logger.log(`✅ Pagamento ${result.paymentId} confirmado via webhook`);
      }

      return { 
        received: true, 
        processed: true, 
        ...result 
      };
    } catch (error: any) {
      this.logger.error(`❌ Erro ao processar webhook PIX: ${error.message}`);
      return { 
        received: true, 
        processed: false, 
        error: error.message 
      };
    }
  }

  /**
   * Extrai o txId do payload do webhook
   */
  private extractTxId(payload: PixWebhookPayload): string | null {
    if (payload.pix && Array.isArray(payload.pix) && payload.pix.length > 0) {
      return payload.pix[0].txid || null;
    }
    if (payload.txId) return payload.txId;
    if (payload.transactionId) return payload.transactionId;
    return null;
  }

  /**
   * Valida assinatura HMAC-SHA256 do webhook
   */
  private validateWebhookSignature(
    payload: unknown,
    signature?: string,
    timestamp?: string,
  ): boolean {
    if (!this.webhookSecret) return false;
    if (!signature) return false;

    const body = timestamp
      ? `${timestamp}.${JSON.stringify(payload)}`
      : JSON.stringify(payload);

    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(body)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computed),
      );
    } catch {
      return false;
    }
  }
}
