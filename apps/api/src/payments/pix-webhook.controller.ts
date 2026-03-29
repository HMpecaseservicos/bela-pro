import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';

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

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/v1/webhooks/pix
   * Endpoint para receber notificações de pagamento PIX
   * 
   * IMPORTANTE: Em produção, adicionar:
   * 1. Validação de assinatura/HMAC do provedor
   * 2. Whitelist de IPs do provedor
   * 3. Rate limiting
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handlePixWebhook(
    @Body() payload: PixWebhookPayload,
    @Headers('x-webhook-signature') signature?: string,
    @Headers('x-webhook-timestamp') timestamp?: string,
  ) {
    this.logger.log(`📥 Webhook PIX recebido`);
    this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

    // TODO: Validar assinatura do webhook (implementar conforme PSP)
    // if (!this.validateWebhookSignature(payload, signature)) {
    //   throw new UnauthorizedException('Assinatura inválida');
    // }

    // Extrair txId do payload (adaptar conforme formato do PSP)
    const txId = this.extractTxId(payload);

    if (!txId) {
      this.logger.warn('⚠️ Webhook recebido sem txId identificável');
      // Retornar 200 mesmo assim para não re-enviar (idempotência)
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
      
      // Retornar 200 para evitar reenvios, mas indicar erro
      return { 
        received: true, 
        processed: false, 
        error: error.message 
      };
    }
  }

  /**
   * Extrai o txId do payload do webhook
   * Adaptar conforme o formato do PSP usado
   */
  private extractTxId(payload: PixWebhookPayload): string | null {
    // Formato BACEN/Gerencianet (array pix)
    if (payload.pix && Array.isArray(payload.pix) && payload.pix.length > 0) {
      return payload.pix[0].txid || null;
    }

    // Formatos alternativos
    if (payload.txId) return payload.txId;
    if (payload.transactionId) return payload.transactionId;

    return null;
  }

  // TODO: Implementar validação de assinatura
  // private validateWebhookSignature(
  //   payload: unknown, 
  //   signature?: string
  // ): boolean {
  //   if (!signature) return false;
  //   const secret = process.env.PIX_WEBHOOK_SECRET;
  //   if (!secret) return false;
  //   
  //   const computed = crypto
  //     .createHmac('sha256', secret)
  //     .update(JSON.stringify(payload))
  //     .digest('hex');
  //   
  //   return crypto.timingSafeEqual(
  //     Buffer.from(signature), 
  //     Buffer.from(computed)
  //   );
  // }
}
