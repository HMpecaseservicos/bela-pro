import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SubscriptionPaymentService', () => {
  let service: SubscriptionPaymentService;
  let prisma: any;
  let billingService: any;

  const mockPlan = {
    id: 'plan-1',
    name: 'Profissional',
    priceMonthly: 4990,
    priceQuarterly: 13970,
    priceSemiannual: null,
    priceAnnual: 47900,
  };

  const mockIntent = {
    id: 'intent-1',
    workspaceId: 'ws-1',
    planId: 'plan-1',
    billingCycle: 'MONTHLY',
    amountCents: 4990,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    confirmedAt: null,
    workspace: { id: 'ws-1', name: 'Test Workspace' },
    plan: mockPlan,
  };

  const createMockPrisma = () => ({
    workspace: { findUnique: jest.fn() },
    subscriptionPaymentIntent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workspaceSubscription: { findUnique: jest.fn() },
    subscriptionInvoice: { create: jest.fn(), findFirst: jest.fn() },
    systemSettings: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionPaymentService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: BillingService,
          useValue: {
            findPlanById: jest.fn().mockResolvedValue(mockPlan),
            upgradePlan: jest.fn().mockResolvedValue({ plan: mockPlan, isPremium: true }),
          },
        },
      ],
    }).compile();

    service = module.get<SubscriptionPaymentService>(SubscriptionPaymentService);
    prisma = module.get<PrismaService>(PrismaService);
    billingService = module.get<BillingService>(BillingService);
  });

  describe('confirmPayment', () => {
    it('deve lançar NotFoundException para intent inexistente', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue(null);
      await expect(service.confirmPayment('nope')).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar intent já processado', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue({
        ...mockIntent,
        status: 'CONFIRMED',
      });
      await expect(service.confirmPayment('intent-1')).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar intent expirado e marcar como EXPIRED', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue({
        ...mockIntent,
        expiresAt: new Date(Date.now() - 60000), // 1 min atrás
      });
      await expect(service.confirmPayment('intent-1')).rejects.toThrow(BadRequestException);
      expect(prisma.subscriptionPaymentIntent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'EXPIRED' } }),
      );
    });

    it('deve confirmar pagamento válido e ativar plano', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue(mockIntent);
      prisma.subscriptionPaymentIntent.update.mockResolvedValue({ ...mockIntent, status: 'CONFIRMED' });
      prisma.workspaceSubscription.findUnique.mockResolvedValue({ id: 'sub-1', workspaceId: 'ws-1', currentPeriodStart: new Date(), currentPeriodEnd: new Date() });
      prisma.subscriptionInvoice.findFirst.mockResolvedValue(null);
      prisma.subscriptionInvoice.create.mockResolvedValue({});

      const result = await service.confirmPayment('intent-1', 'admin-1');

      expect(result.success).toBe(true);
      expect(billingService.upgradePlan).toHaveBeenCalledWith('ws-1', 'plan-1', 'MONTHLY');
    });
  });

  describe('listPendingPayments', () => {
    it('deve listar apenas payments PENDING', async () => {
      prisma.subscriptionPaymentIntent.findMany.mockResolvedValue([mockIntent]);
      const result = await service.listPendingPayments();
      expect(result).toHaveLength(1);
      expect(prisma.subscriptionPaymentIntent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PENDING' } }),
      );
    });
  });

  describe('deletePaymentIntent', () => {
    it('deve lançar NotFoundException para intent inexistente', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue(null);
      await expect(service.deletePaymentIntent('nope')).rejects.toThrow(NotFoundException);
    });

    it('deve rejeitar exclusão de pagamento confirmado', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue({
        ...mockIntent,
        status: 'CONFIRMED',
      });
      await expect(service.deletePaymentIntent('intent-1')).rejects.toThrow(BadRequestException);
    });

    it('deve excluir payment expirado com sucesso', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue({
        ...mockIntent,
        status: 'EXPIRED',
      });
      prisma.subscriptionPaymentIntent.delete.mockResolvedValue({});
      const result = await service.deletePaymentIntent('intent-1');
      expect(result.success).toBe(true);
    });
  });

  describe('checkPaymentStatus', () => {
    it('deve retornar status correto', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue(mockIntent);
      const result = await service.checkPaymentStatus('intent-1');
      expect(result.status).toBe('PENDING');
    });

    it('deve auto-expirar intent vencido', async () => {
      prisma.subscriptionPaymentIntent.findUnique.mockResolvedValue({
        ...mockIntent,
        expiresAt: new Date(Date.now() - 60000),
      });
      prisma.subscriptionPaymentIntent.update.mockResolvedValue({});
      const result = await service.checkPaymentStatus('intent-1');
      expect(result.status).toBe('EXPIRED');
    });
  });
});
