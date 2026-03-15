import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service';
import { BillingCycle } from '@prisma/client';

/**
 * Service para processar pagamentos de assinaturas
 * Integra com PIX (manual ou gateway) para upgrade de planos
 */
@Injectable()
export class SubscriptionPaymentService {
  private readonly logger = new Logger(SubscriptionPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  /**
   * Gera um pedido de pagamento PIX para upgrade de plano
   */
  async createPaymentIntent(
    workspaceId: string,
    planId: string,
    billingCycle: BillingCycle = 'MONTHLY'
  ) {
    // Buscar plano
    const plan = await this.billingService.findPlanById(planId);
    
    // Verificar se plano é pago
    if (plan.priceMonthly === 0) {
      throw new BadRequestException('Este plano é gratuito, não requer pagamento');
    }

    // Calcular valor
    const amount = this.calculateAmount(plan, billingCycle);

    // Buscar workspace para dados do PIX
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { subscription: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    // Buscar configurações do sistema (PIX da plataforma)
    const pixSettings = await this.getSystemPixSettings();

    // Criar intent de pagamento
    const paymentIntent = await this.prisma.subscriptionPaymentIntent.create({
      data: {
        workspaceId,
        planId,
        billingCycle,
        amountCents: amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutos
        pixCode: this.generatePixCode(amount, workspace.name, pixSettings),
        pixQrCode: null, // TODO: Gerar QR Code via API
      },
    });

    return {
      intentId: paymentIntent.id,
      plan: {
        id: plan.id,
        name: plan.name,
      },
      billingCycle,
      amount: amount / 100, // Converter para reais
      amountFormatted: this.formatCurrency(amount),
      pixCode: paymentIntent.pixCode,
      pixQrCode: paymentIntent.pixQrCode,
      expiresAt: paymentIntent.expiresAt,
      expiresInMinutes: 30,
    };
  }

  /**
   * Simula confirmação de pagamento (para testes ou confirmação manual)
   * Em produção, isso viria de webhook do gateway
   */
  async confirmPayment(intentId: string, adminUserId?: string) {
    const intent = await this.prisma.subscriptionPaymentIntent.findUnique({
      where: { id: intentId },
      include: { workspace: true, plan: true },
    });

    if (!intent) {
      throw new NotFoundException('Intent de pagamento não encontrado');
    }

    if (intent.status !== 'PENDING') {
      throw new BadRequestException('Este pagamento já foi processado');
    }

    // Verificar expiração
    if (new Date() > intent.expiresAt) {
      await this.prisma.subscriptionPaymentIntent.update({
        where: { id: intentId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Pagamento expirado');
    }

    // Atualizar intent
    await this.prisma.subscriptionPaymentIntent.update({
      where: { id: intentId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedByUserId: adminUserId,
      },
    });

    // Ativar plano
    const planInfo = await this.billingService.upgradePlan(
      intent.workspaceId,
      intent.planId,
      intent.billingCycle
    );

    // Criar fatura paga automaticamente
    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId: intent.workspaceId },
    });

    if (subscription) {
      const invoiceNumber = await this.generateInvoiceNumber();
      await this.prisma.subscriptionInvoice.create({
        data: {
          subscriptionId: subscription.id,
          invoiceNumber,
          amountCents: intent.amountCents,
          discountCents: 0,
          totalCents: intent.amountCents,
          dueDate: new Date(),
          paidAt: new Date(),
          status: 'PAID',
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
          description: `Upgrade para ${intent.plan?.name} - PIX`,
        },
      });
    }

    this.logger.log(`💰 Pagamento confirmado: workspace ${intent.workspaceId} → plano ${intent.plan?.name}`);

    return {
      success: true,
      message: 'Pagamento confirmado! Seu plano foi ativado.',
      plan: planInfo.plan,
      isPremium: planInfo.isPremium,
    };
  }

  /**
   * Verifica status de um pagamento (polling do frontend)
   */
  async checkPaymentStatus(intentId: string) {
    const intent = await this.prisma.subscriptionPaymentIntent.findUnique({
      where: { id: intentId },
      include: { plan: true },
    });

    if (!intent) {
      throw new NotFoundException('Intent não encontrado');
    }

    // Verificar expiração
    if (intent.status === 'PENDING' && new Date() > intent.expiresAt) {
      await this.prisma.subscriptionPaymentIntent.update({
        where: { id: intentId },
        data: { status: 'EXPIRED' },
      });
      return { status: 'EXPIRED', message: 'Pagamento expirado' };
    }

    return {
      status: intent.status,
      plan: intent.plan ? {
        id: intent.plan.id,
        name: intent.plan.name,
      } : null,
      confirmedAt: intent.confirmedAt,
    };
  }

  /**
   * Lista pagamentos pendentes (admin)
   */
  async listPendingPayments() {
    return this.prisma.subscriptionPaymentIntent.findMany({
      where: { status: 'PENDING' },
      include: {
        workspace: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== HELPERS ====================

  private calculateAmount(plan: any, cycle: BillingCycle): number {
    switch (cycle) {
      case 'QUARTERLY':
        return plan.priceQuarterly || plan.priceMonthly * 3;
      case 'SEMIANNUAL':
        return plan.priceSemiannual || plan.priceMonthly * 6;
      case 'ANNUAL':
        return plan.priceAnnual || plan.priceMonthly * 12;
      default:
        return plan.priceMonthly;
    }
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }

  private generatePixCode(amountCents: number, description: string, settings: any): string {
    // Gerar PIX Copia e Cola (simplificado)
    // Em produção, usar library como pix-utils ou integrar com gateway
    const amount = (amountCents / 100).toFixed(2);
    return `00020126580014br.gov.bcb.pix0136${settings?.pixKey || 'CHAVE_PIX_PLATAFORMA'}5204000053039865802BR5925${(description || 'BELA PRO').slice(0, 25).padEnd(25)}6008SAOPAULO62070503***6304`;
  }

  private async getSystemPixSettings() {
    // Buscar configurações do PIX da plataforma
    const [pixKey, pixName] = await Promise.all([
      this.prisma.systemSettings.findUnique({ where: { key: 'pix_key' } }),
      this.prisma.systemSettings.findUnique({ where: { key: 'pix_holder_name' } }),
    ]);

    return {
      pixKey: pixKey?.value || null,
      pixHolderName: pixName?.value || 'BELA PRO',
    };
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const lastInvoice = await this.prisma.subscriptionInvoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    let number = 1;
    if (lastInvoice) {
      const lastNumber = parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10);
      number = lastNumber + 1;
    }

    return `${prefix}${String(number).padStart(5, '0')}`;
  }
}
