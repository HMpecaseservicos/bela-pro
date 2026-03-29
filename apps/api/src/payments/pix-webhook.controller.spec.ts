import { Test, TestingModule } from '@nestjs/testing';
import { PixWebhookController } from './pix-webhook.controller';
import { PaymentsService } from './payments.service';
import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

describe('PixWebhookController', () => {
  let controller: PixWebhookController;
  let paymentsService: PaymentsService;

  const WEBHOOK_SECRET = 'test-secret-key-for-hmac-validation';

  const createSignature = (payload: any, timestamp?: string): string => {
    const body = timestamp
      ? `${timestamp}.${JSON.stringify(payload)}`
      : JSON.stringify(payload);
    return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
  };

  const mockReq = (ip = '127.0.0.1') => ({
    headers: { 'x-forwarded-for': ip },
    socket: { remoteAddress: ip },
  });

  beforeEach(async () => {
    process.env.PIX_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.PIX_WEBHOOK_ALLOWED_IPS = '';

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PixWebhookController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            confirmByWebhook: jest.fn().mockResolvedValue({
              success: true,
              alreadyProcessed: false,
              paymentId: 'pay-1',
              appointmentId: 'apt-1',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<PixWebhookController>(PixWebhookController);
    paymentsService = module.get<PaymentsService>(PaymentsService);
  });

  afterEach(() => {
    delete process.env.PIX_WEBHOOK_SECRET;
    delete process.env.PIX_WEBHOOK_ALLOWED_IPS;
  });

  describe('Segurança — assinatura HMAC', () => {
    it('deve rejeitar webhook sem assinatura', async () => {
      const payload = { txId: 'tx-123' };
      await expect(
        controller.handlePixWebhook(payload, undefined, undefined, mockReq() as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve rejeitar webhook com assinatura inválida', async () => {
      const payload = { txId: 'tx-123' };
      await expect(
        controller.handlePixWebhook(payload, 'invalid-signature', undefined, mockReq() as any),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve aceitar webhook com assinatura válida', async () => {
      const payload = { txId: 'tx-123' };
      const sig = createSignature(payload);
      const result = await controller.handlePixWebhook(payload, sig, undefined, mockReq() as any);
      expect(result.received).toBe(true);
      expect(result.processed).toBe(true);
    });

    it('deve validar assinatura com timestamp', async () => {
      const payload = { txId: 'tx-456' };
      const ts = String(Date.now());
      const sig = createSignature(payload, ts);
      const result = await controller.handlePixWebhook(payload, sig, ts, mockReq() as any);
      expect(result.processed).toBe(true);
    });

    it('deve rejeitar timestamp expirado (> 5min)', async () => {
      const payload = { txId: 'tx-789' };
      const oldTs = String(Date.now() - 6 * 60 * 1000); // 6 min ago
      const sig = createSignature(payload, oldTs);
      await expect(
        controller.handlePixWebhook(payload, sig, oldTs, mockReq() as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Segurança — whitelist de IPs', () => {
    it('deve rejeitar IP fora da whitelist', async () => {
      // Recria controller com IPs configurados
      process.env.PIX_WEBHOOK_ALLOWED_IPS = '10.0.0.1,10.0.0.2';
      const module = await Test.createTestingModule({
        controllers: [PixWebhookController],
        providers: [{ provide: PaymentsService, useValue: { confirmByWebhook: jest.fn() } }],
      }).compile();
      const ctrl = module.get<PixWebhookController>(PixWebhookController);

      const payload = { txId: 'tx-1' };
      const sig = createSignature(payload);
      await expect(
        ctrl.handlePixWebhook(payload, sig, undefined, mockReq('192.168.1.1') as any),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Processamento de payload', () => {
    it('deve extrair txId do formato BACEN (array pix)', async () => {
      const payload = { pix: [{ txid: 'bacen-tx-1', valor: '49.90' }] };
      const sig = createSignature(payload);
      await controller.handlePixWebhook(payload, sig, undefined, mockReq() as any);
      expect(paymentsService.confirmByWebhook).toHaveBeenCalledWith(
        'bacen-tx-1',
        expect.any(String),
      );
    });

    it('deve extrair txId de formatos alternativos', async () => {
      const payload = { transactionId: 'alt-tx-1' };
      const sig = createSignature(payload);
      await controller.handlePixWebhook(payload, sig, undefined, mockReq() as any);
      expect(paymentsService.confirmByWebhook).toHaveBeenCalledWith(
        'alt-tx-1',
        expect.any(String),
      );
    });

    it('deve retornar processed=false quando não há txId', async () => {
      const payload = { status: 'completed' }; // sem txId
      const sig = createSignature(payload);
      const result = await controller.handlePixWebhook(payload, sig, undefined, mockReq() as any);
      expect(result.processed).toBe(false);
      expect(result.reason).toBe('no_txid');
    });

    it('deve lidar com pagamento já processado (idempotência)', async () => {
      (paymentsService.confirmByWebhook as jest.Mock).mockResolvedValue({
        success: true,
        alreadyProcessed: true,
        paymentId: 'pay-1',
      });
      const payload = { txId: 'tx-dup' };
      const sig = createSignature(payload);
      const result = await controller.handlePixWebhook(payload, sig, undefined, mockReq() as any);
      expect((result as any).alreadyProcessed).toBe(true);
    });
  });
});
