import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubscriptionStatus, InvoiceStatus, BillingCycle } from '@prisma/client';
import { z } from 'zod';

// ==================== SCHEMAS DE VALIDAÇÃO ====================

const createPlanSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  priceMonthly: z.number().int().min(0),
  priceQuarterly: z.number().int().min(0).optional(),
  priceSemiannual: z.number().int().min(0).optional(),
  priceAnnual: z.number().int().min(0).optional(),
  maxAppointments: z.number().int().min(1).optional().nullable(),
  maxClients: z.number().int().min(1).optional().nullable(),
  maxTeamMembers: z.number().int().min(1).optional().nullable(),
  chatbotEnabled: z.boolean().default(true),
  whatsappEnabled: z.boolean().default(true),
  financialEnabled: z.boolean().default(true),
  pixPaymentEnabled: z.boolean().default(true),
  features: z.array(z.string()).default([]),
  trialDays: z.number().int().min(0).default(7),
  isHighlighted: z.boolean().default(false),
});

const updatePlanSchema = createPlanSchema.partial();

const createSubscriptionSchema = z.object({
  workspaceId: z.string().cuid(),
  planId: z.string().cuid(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']).default('MONTHLY'),
  discountPercent: z.number().int().min(0).max(100).optional(),
  discountNote: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  startTrial: z.boolean().default(true),
});

const updateSubscriptionSchema = z.object({
  planId: z.string().cuid().optional(),
  billingCycle: z.enum(['MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL']).optional(),
  status: z.enum(['ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELLED', 'SUSPENDED']).optional(),
  discountPercent: z.number().int().min(0).max(100).optional().nullable(),
  discountNote: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const systemSettingSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000),
});

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== PLANOS ====================

  async findAllPlans(includeInactive = false) {
    return this.prisma.subscriptionPlan.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findPlanById(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    return plan;
  }

  async createPlan(data: unknown) {
    const input = createPlanSchema.parse(data);

    // Determinar próxima ordem
    const lastPlan = await this.prisma.subscriptionPlan.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    return this.prisma.subscriptionPlan.create({
      data: {
        ...input,
        sortOrder: (lastPlan?.sortOrder ?? 0) + 1,
      },
    });
  }

  async updatePlan(id: string, data: unknown) {
    await this.findPlanById(id);
    const input = updatePlanSchema.parse(data);

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: input,
    });
  }

  async deletePlan(id: string) {
    const plan = await this.findPlanById(id);

    // Verificar se há assinaturas ativas
    const activeSubscriptions = await this.prisma.workspaceSubscription.count({
      where: {
        planId: id,
        status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] },
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Não é possível excluir: ${activeSubscriptions} assinatura(s) ativa(s) usando este plano`
      );
    }

    // Soft delete - apenas desativa
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async reorderPlans(planIds: string[]) {
    // Atualiza a ordem dos planos
    const updates = planIds.map((id, index) =>
      this.prisma.subscriptionPlan.update({
        where: { id },
        data: { sortOrder: index },
      })
    );

    await Promise.all(updates);
    return { success: true };
  }

  // ==================== ASSINATURAS ====================

  async findAllSubscriptions(filters: {
    status?: SubscriptionStatus;
    planId?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, planId, search, page = 1, limit = 20 } = filters;

    const where: Prisma.WorkspaceSubscriptionWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (planId) {
      where.planId = planId;
    }

    if (search) {
      where.workspace = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [subscriptions, total] = await Promise.all([
      this.prisma.workspaceSubscription.findMany({
        where,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              priceMonthly: true,
            },
          },
          _count: {
            select: { invoices: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workspaceSubscription.count({ where }),
    ]);

    return {
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findSubscriptionById(id: string) {
    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { id },
      include: {
        workspace: true,
        plan: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada');
    }

    return subscription;
  }

  async findSubscriptionByWorkspace(workspaceId: string) {
    return this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
      include: {
        plan: true,
        invoices: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
          take: 5,
        },
      },
    });
  }

  async createSubscription(data: unknown) {
    const input = createSubscriptionSchema.parse(data);

    // Verificar se workspace já tem assinatura
    const existing = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId: input.workspaceId },
    });

    if (existing) {
      throw new BadRequestException('Workspace já possui uma assinatura');
    }

    // Verificar se plano existe
    const plan = await this.findPlanById(input.planId);

    // Calcular datas
    const now = new Date();
    const trialEndsAt = input.startTrial 
      ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
      : null;
    
    const periodEnd = this.calculatePeriodEnd(now, input.billingCycle);

    return this.prisma.workspaceSubscription.create({
      data: {
        workspaceId: input.workspaceId,
        planId: input.planId,
        billingCycle: input.billingCycle,
        status: input.startTrial ? 'TRIAL' : 'ACTIVE',
        trialEndsAt,
        currentPeriodStart: now,
        currentPeriodEnd: trialEndsAt || periodEnd,
        discountPercent: input.discountPercent,
        discountNote: input.discountNote,
        notes: input.notes,
      },
      include: {
        workspace: true,
        plan: true,
      },
    });
  }

  async updateSubscription(id: string, data: unknown) {
    await this.findSubscriptionById(id);
    const input = updateSubscriptionSchema.parse(data);

    // Se estiver alterando o plano, verificar se existe
    if (input.planId) {
      await this.findPlanById(input.planId);
    }

    return this.prisma.workspaceSubscription.update({
      where: { id },
      data: input,
      include: {
        workspace: true,
        plan: true,
      },
    });
  }

  async cancelSubscription(id: string, reason?: string) {
    const subscription = await this.findSubscriptionById(id);

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('Assinatura já está cancelada');
    }

    return this.prisma.workspaceSubscription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        notes: reason ? `${subscription.notes || ''}\n[Cancelamento] ${reason}`.trim() : subscription.notes,
      },
    });
  }

  async activateSubscription(id: string) {
    const subscription = await this.findSubscriptionById(id);

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, subscription.billingCycle);

    return this.prisma.workspaceSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: {
        workspace: true,
        plan: true,
      },
    });
  }

  // ==================== FATURAS ====================

  async findAllInvoices(filters: {
    subscriptionId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  } = {}) {
    const { subscriptionId, status, page = 1, limit = 20 } = filters;

    const where: Prisma.SubscriptionInvoiceWhereInput = {};

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.subscriptionInvoice.findMany({
        where,
        include: {
          subscription: {
            include: {
              workspace: {
                select: { id: true, name: true, slug: true },
              },
              plan: {
                select: { id: true, name: true },
              },
            },
          },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscriptionInvoice.count({ where }),
    ]);

    return {
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createInvoice(subscriptionId: string) {
    const subscription = await this.findSubscriptionById(subscriptionId);

    // Calcular valor
    const plan = subscription.plan;
    let amountCents = this.getPriceForCycle(plan, subscription.billingCycle);

    // Aplicar desconto se houver
    const discountCents = subscription.discountPercent
      ? Math.floor((amountCents * subscription.discountPercent) / 100)
      : 0;

    const totalCents = amountCents - discountCents;

    // Gerar número da fatura
    const invoiceNumber = await this.generateInvoiceNumber();

    // Data de vencimento (15 dias)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    return this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId,
        invoiceNumber,
        amountCents,
        discountCents,
        totalCents,
        dueDate,
        status: 'PENDING',
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        description: `Assinatura ${plan.name} - ${this.getBillingCycleLabel(subscription.billingCycle)}`,
      },
      include: {
        subscription: {
          include: {
            workspace: true,
            plan: true,
          },
        },
      },
    });
  }

  async markInvoiceAsPaid(invoiceId: string, paymentData: {
    paymentMethod: string;
    transactionId?: string;
    notes?: string;
  }) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
      include: { subscription: true },
    });

    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Fatura já está paga');
    }

    // Criar registro de pagamento
    await this.prisma.invoicePayment.create({
      data: {
        invoiceId,
        amountCents: invoice.totalCents,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        notes: paymentData.notes,
      },
    });

    // Atualizar fatura
    const updatedInvoice = await this.prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Ativar assinatura se estava suspensa ou pendente
    if (['PAST_DUE', 'SUSPENDED'].includes(invoice.subscription.status)) {
      await this.prisma.workspaceSubscription.update({
        where: { id: invoice.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }

    this.logger.log(`💰 Fatura ${invoice.invoiceNumber} marcada como paga`);

    return updatedInvoice;
  }

  async cancelInvoice(invoiceId: string) {
    const invoice = await this.prisma.subscriptionInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Fatura não encontrada');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Não é possível cancelar fatura já paga');
    }

    return this.prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });
  }

  // ==================== CONFIGURAÇÕES DO SISTEMA ====================

  async getSetting(key: string) {
    const setting = await this.prisma.systemSettings.findUnique({
      where: { key },
    });
    return setting?.value;
  }

  async getSettings(prefix?: string) {
    const where = prefix ? { key: { startsWith: prefix } } : {};
    const settings = await this.prisma.systemSettings.findMany({ where });
    
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }

  async setSetting(key: string, value: string) {
    const input = systemSettingSchema.parse({ key, value });

    return this.prisma.systemSettings.upsert({
      where: { key: input.key },
      update: { value: input.value },
      create: { key: input.key, value: input.value },
    });
  }

  async setSettings(settings: Record<string, string>) {
    const operations = Object.entries(settings).map(([key, value]) =>
      this.prisma.systemSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    );

    await Promise.all(operations);
    return { success: true };
  }

  // ==================== DASHBOARD / MÉTRICAS ====================

  async getBillingDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      suspendedSubscriptions,
      pendingInvoices,
      paidThisMonth,
      revenueByPlan,
    ] = await Promise.all([
      // Total de assinaturas
      this.prisma.workspaceSubscription.count(),

      // Assinaturas ativas
      this.prisma.workspaceSubscription.count({
        where: { status: 'ACTIVE' },
      }),

      // Em trial
      this.prisma.workspaceSubscription.count({
        where: { status: 'TRIAL' },
      }),

      // Suspensas
      this.prisma.workspaceSubscription.count({
        where: { status: { in: ['SUSPENDED', 'PAST_DUE'] } },
      }),

      // Faturas pendentes
      this.prisma.subscriptionInvoice.aggregate({
        where: { status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { totalCents: true },
        _count: true,
      }),

      // Receita do mês
      this.prisma.subscriptionInvoice.aggregate({
        where: {
          status: 'PAID',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: { totalCents: true },
        _count: true,
      }),

      // Receita por plano
      this.prisma.subscriptionPlan.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: { subscriptions: true },
          },
          subscriptions: {
            where: {
              status: { in: ['ACTIVE', 'TRIAL'] },
            },
            select: {
              billingCycle: true,
              discountPercent: true,
            },
          },
        },
        where: { isActive: true },
      }),
    ]);

    // Calcular MRR (Monthly Recurring Revenue)
    let mrr = 0;
    for (const plan of revenueByPlan) {
      const fullPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: plan.id },
      });
      
      if (fullPlan) {
        for (const sub of plan.subscriptions) {
          const price = this.getMonthlyEquivalent(fullPlan, sub.billingCycle);
          const discount = sub.discountPercent ? (price * sub.discountPercent) / 100 : 0;
          mrr += price - discount;
        }
      }
    }

    return {
      subscriptions: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        trial: trialSubscriptions,
        suspended: suspendedSubscriptions,
      },
      invoices: {
        pendingCount: pendingInvoices._count,
        pendingAmount: pendingInvoices._sum.totalCents || 0,
        paidThisMonth: paidThisMonth._count,
        revenueThisMonth: paidThisMonth._sum.totalCents || 0,
      },
      mrr,
      revenueByPlan: revenueByPlan.map(p => ({
        planId: p.id,
        name: p.name,
        subscriptions: p._count.subscriptions,
      })),
    };
  }

  // ==================== HELPERS ====================

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    switch (cycle) {
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'SEMIANNUAL':
        end.setMonth(end.getMonth() + 6);
        break;
      case 'ANNUAL':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }

  private getPriceForCycle(plan: any, cycle: BillingCycle): number {
    switch (cycle) {
      case 'MONTHLY':
        return plan.priceMonthly;
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

  private getMonthlyEquivalent(plan: any, cycle: BillingCycle): number {
    const total = this.getPriceForCycle(plan, cycle);
    switch (cycle) {
      case 'MONTHLY':
        return total;
      case 'QUARTERLY':
        return total / 3;
      case 'SEMIANNUAL':
        return total / 6;
      case 'ANNUAL':
        return total / 12;
      default:
        return total;
    }
  }

  private getBillingCycleLabel(cycle: BillingCycle): string {
    const labels: Record<BillingCycle, string> = {
      MONTHLY: 'Mensal',
      QUARTERLY: 'Trimestral',
      SEMIANNUAL: 'Semestral',
      ANNUAL: 'Anual',
    };
    return labels[cycle];
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const lastInvoice = await this.prisma.subscriptionInvoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
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
