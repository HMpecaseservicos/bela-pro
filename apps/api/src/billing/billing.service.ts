import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, SubscriptionStatus, InvoiceStatus, BillingCycle, PlanTier } from '@prisma/client';
import { z } from 'zod';

// ==================== SCHEMAS DE VALIDAÇÃO ====================

const createPlanSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).optional(), // Auto-gerado se não fornecido
  description: z.string().max(500).optional(),
  tier: z.enum(['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE']).default('PRO'),
  priceMonthly: z.number().int().min(0),
  priceQuarterly: z.number().int().min(0).optional(),
  priceSemiannual: z.number().int().min(0).optional(),
  priceAnnual: z.number().int().min(0).optional(),
  maxAppointments: z.number().int().min(1).optional().nullable(),
  maxClients: z.number().int().min(1).optional().nullable(),
  maxTeamMembers: z.number().int().min(1).optional().nullable(),
  maxServices: z.number().int().min(1).optional().nullable(),
  chatbotEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  financialEnabled: z.boolean().default(false),
  pixPaymentEnabled: z.boolean().default(false),
  reportsEnabled: z.boolean().default(false),
  remindersEnabled: z.boolean().default(false),
  hideGlobalSponsors: z.boolean().default(false),
  localSponsorsEnabled: z.boolean().default(false),
  localSponsorsLimit: z.number().int().min(0).default(0),
  features: z.array(z.string()).default([]),
  trialDays: z.number().int().min(0).default(0),
  isHighlighted: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isFree: z.boolean().default(false),
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

    // Gerar slug se não fornecido
    const slug = input.slug || this.generateSlug(input.name);

    // Verificar se slug já existe
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { slug } });
    if (existing) {
      throw new BadRequestException(`Já existe um plano com o slug "${slug}"`);
    }

    // Determinar próxima ordem
    const lastPlan = await this.prisma.subscriptionPlan.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    return this.prisma.subscriptionPlan.create({
      data: {
        ...input,
        slug,
        sortOrder: (lastPlan?.sortOrder ?? 0) + 1,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-')     // Substitui caracteres especiais por -
      .replace(/^-|-$/g, '');          // Remove - do início e fim
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

  // ==================== PLANO AUTOMÁTICO & FEATURES ====================

  /**
   * Busca o plano gratuito padrão
   * NOTA: Os campos novos (isFree, slug, tier, etc) serão adicionados via migration
   */
  async getFreePlan() {
    // Busca pelo campo isFree (após migration)
    let plan = await this.prisma.subscriptionPlan.findFirst({
      where: { isActive: true, priceMonthly: 0 } as any, // isFree após migration
    });

    // Fallback: busca pelo preço zero
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true, priceMonthly: 0 },
        orderBy: { sortOrder: 'asc' },
      });
    }

    // Se ainda não existe, pega o mais barato
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.findFirst({
        where: { isActive: true },
        orderBy: { priceMonthly: 'asc' },
      });
    }

    return plan;
  }

  /**
   * Cria assinatura gratuita automática para novo workspace
   */
  async createFreeSubscription(workspaceId: string) {
    const freePlan = await this.getFreePlan();
    if (!freePlan) {
      this.logger.warn('Nenhum plano gratuito encontrado');
      return null;
    }

    // Verificar se já tem assinatura
    const existing = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
    });

    if (existing) {
      return existing;
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 10); // Plano free não expira

    const subscription = await this.prisma.workspaceSubscription.create({
      data: {
        workspaceId,
        planId: freePlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        notes: 'Plano gratuito automático',
      },
      include: { plan: true },
    });

    // Sincronizar workspace com as configurações do plano
    await this.syncWorkspaceWithPlan(workspaceId);

    this.logger.log(`✨ Assinatura gratuita criada para workspace ${workspaceId}`);
    return subscription;
  }

  /**
   * Obtém informações completas do plano do workspace
   * Inclui compatibilidade com campos antigos e novos do schema
   */
  async getWorkspacePlanInfo(workspaceId: string) {
    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
      include: {
        plan: true,
        workspace: {
          select: {
            id: true,
            name: true,
            showGlobalSponsors: true,
            localSponsorsEnabled: true,
            localSponsorsLimit: true,
          },
        },
      },
    });

    if (!subscription) {
      // Retorna info de plano gratuito mesmo sem assinatura
      const freePlan = await this.getFreePlan();
      const planAny = freePlan as any;
      return {
        hasSubscription: false,
        status: 'FREE' as const,
        plan: freePlan,
        isPremium: false,
        isTrialing: false,
        features: {
          chatbotEnabled: freePlan?.chatbotEnabled ?? false,
          whatsappEnabled: freePlan?.whatsappEnabled ?? false,
          financialEnabled: freePlan?.financialEnabled ?? false,
          pixPaymentEnabled: freePlan?.pixPaymentEnabled ?? false,
          reportsEnabled: planAny?.reportsEnabled ?? false,
          remindersEnabled: planAny?.remindersEnabled ?? false,
          hideGlobalSponsors: planAny?.hideGlobalSponsors ?? false,
          localSponsorsEnabled: planAny?.localSponsorsEnabled ?? false,
          localSponsorsLimit: planAny?.localSponsorsLimit ?? 0,
          maxAppointments: freePlan?.maxAppointments || 100,
          maxClients: freePlan?.maxClients || 50,
          maxTeamMembers: freePlan?.maxTeamMembers || 1,
          maxServices: planAny?.maxServices || 5,
        },
        showAds: true, // FREE vê anúncios
      };
    }

    const plan = subscription.plan;
    const planAny = plan as any;
    const isActive = subscription.status === 'ACTIVE';
    const isTrialing = subscription.status === 'TRIAL';
    const isFree = planAny.isFree ?? (plan.priceMonthly === 0);
    const isPremium = isActive && !isFree;

    // Verificar se trial expirou
    const trialExpired = isTrialing && subscription.trialEndsAt && new Date() > subscription.trialEndsAt;

    return {
      hasSubscription: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      plan: {
        id: plan.id,
        slug: planAny.slug || plan.name.toLowerCase().replace(/\s+/g, '-'),
        name: plan.name,
        tier: planAny.tier || (isFree ? 'FREE' : 'PRO'),
        priceMonthly: plan.priceMonthly,
        isFree,
      },
      billingCycle: subscription.billingCycle,
      currentPeriodEnd: subscription.currentPeriodEnd,
      trialEndsAt: subscription.trialEndsAt,
      trialExpired,
      isPremium,
      isTrialing,
      features: {
        chatbotEnabled: plan.chatbotEnabled,
        whatsappEnabled: plan.whatsappEnabled,
        financialEnabled: plan.financialEnabled,
        pixPaymentEnabled: plan.pixPaymentEnabled,
        reportsEnabled: planAny.reportsEnabled ?? false,
        remindersEnabled: planAny.remindersEnabled ?? false,
        hideGlobalSponsors: planAny.hideGlobalSponsors ?? false,
        localSponsorsEnabled: planAny.localSponsorsEnabled ?? false,
        localSponsorsLimit: planAny.localSponsorsLimit ?? 0,
        maxAppointments: plan.maxAppointments,
        maxClients: plan.maxClients,
        maxTeamMembers: plan.maxTeamMembers,
        maxServices: planAny.maxServices || null,
      },
      featuresList: plan.features || [],
      showAds: !isPremium && !isTrialing, // FREE ou trial expirado vê anúncios
    };
  }

  /**
   * Verifica se uma feature específica está habilitada para o workspace
   */
  async checkFeature(workspaceId: string, feature: string): Promise<boolean> {
    const info = await this.getWorkspacePlanInfo(workspaceId);
    
    // Features que não dependem de status
    const featureMap: Record<string, boolean> = {
      chatbot: info.features.chatbotEnabled,
      whatsapp: info.features.whatsappEnabled,
      financial: info.features.financialEnabled,
      pix: info.features.pixPaymentEnabled,
      reports: info.features.reportsEnabled,
      reminders: info.features.remindersEnabled,
      localSponsors: info.features.localSponsorsEnabled,
      hideAds: info.features.hideGlobalSponsors,
    };

    return featureMap[feature] ?? false;
  }

  /**
   * Sincroniza configurações do workspace baseado no plano ativo
   */
  async syncWorkspaceWithPlan(workspaceId: string) {
    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    if (!subscription) {
      // Sem assinatura = configurações de plano free
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          showGlobalSponsors: true, // Free vê anúncios
          localSponsorsEnabled: false,
          localSponsorsLimit: 0,
        },
      });
      return;
    }

    const plan = subscription.plan;
    const planAny = plan as any;
    const isActive = ['ACTIVE', 'TRIAL'].includes(subscription.status);

    const hideGlobalSponsors = planAny.hideGlobalSponsors ?? false;
    const localSponsorsEnabled = planAny.localSponsorsEnabled ?? false;
    const localSponsorsLimit = planAny.localSponsorsLimit ?? 0;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        // Se plano permite ocultar e está ativo, oculta
        showGlobalSponsors: isActive ? !hideGlobalSponsors : true,
        // Sponsors locais habilitados pelo plano
        localSponsorsEnabled: isActive ? localSponsorsEnabled : false,
        localSponsorsLimit,
      },
    });

    this.logger.log(`🔄 Workspace ${workspaceId} sincronizado com plano ${plan.name}`);
  }

  /**
   * Atualiza assinatura e sincroniza workspace (usado após pagamento)
   */
  async upgradePlan(workspaceId: string, newPlanId: string, billingCycle: BillingCycle = 'MONTHLY') {
    const plan = await this.findPlanById(newPlanId);
    
    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
    });

    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, billingCycle);

    if (subscription) {
      // Atualizar assinatura existente
      await this.prisma.workspaceSubscription.update({
        where: { workspaceId },
        data: {
          planId: newPlanId,
          billingCycle,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null, // Remove trial ao fazer upgrade
        },
      });
    } else {
      // Criar nova assinatura
      await this.prisma.workspaceSubscription.create({
        data: {
          workspaceId,
          planId: newPlanId,
          billingCycle,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });
    }

    // Sincronizar workspace com novo plano
    await this.syncWorkspaceWithPlan(workspaceId);

    this.logger.log(`⬆️ Workspace ${workspaceId} fez upgrade para ${plan.name}`);

    return this.getWorkspacePlanInfo(workspaceId);
  }

  /**
   * Inicia período de trial para um workspace
   */
  async startTrial(workspaceId: string, planId: string) {
    const plan = await this.findPlanById(planId);
    
    if (plan.trialDays <= 0) {
      throw new BadRequestException('Este plano não oferece período de teste');
    }

    const subscription = await this.prisma.workspaceSubscription.findUnique({
      where: { workspaceId },
    });

    // Verificar se já usou trial
    if (subscription && subscription.trialEndsAt) {
      throw new BadRequestException('Período de teste já utilizado');
    }

    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

    if (subscription) {
      await this.prisma.workspaceSubscription.update({
        where: { workspaceId },
        data: {
          planId,
          status: 'TRIAL',
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
        },
      });
    } else {
      await this.prisma.workspaceSubscription.create({
        data: {
          workspaceId,
          planId,
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
        },
      });
    }

    await this.syncWorkspaceWithPlan(workspaceId);

    this.logger.log(`🎁 Trial iniciado para workspace ${workspaceId} - ${plan.trialDays} dias`);

    return this.getWorkspacePlanInfo(workspaceId);
  }

  /**
   * Lista planos disponíveis para upgrade (públicos)
   * Compatível com schema antigo e novo
   */
  async getAvailablePlans() {
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan: any) => ({
      id: plan.id,
      slug: plan.slug || plan.name.toLowerCase().replace(/\s+/g, '-'),
      name: plan.name,
      description: plan.description,
      tier: plan.tier || (plan.priceMonthly === 0 ? 'FREE' : 'PRO'),
      priceMonthly: plan.priceMonthly,
      priceQuarterly: plan.priceQuarterly,
      priceSemiannual: plan.priceSemiannual,
      priceAnnual: plan.priceAnnual,
      features: plan.features || [],
      isHighlighted: plan.isHighlighted || false,
      isFree: plan.isFree ?? (plan.priceMonthly === 0),
      trialDays: plan.trialDays || 0,
      maxAppointments: plan.maxAppointments,
      maxClients: plan.maxClients,
      maxTeamMembers: plan.maxTeamMembers,
      maxServices: plan.maxServices || null,
      chatbotEnabled: plan.chatbotEnabled ?? false,
      whatsappEnabled: plan.whatsappEnabled ?? false,
      financialEnabled: plan.financialEnabled ?? false,
      pixPaymentEnabled: plan.pixPaymentEnabled ?? false,
      reportsEnabled: plan.reportsEnabled ?? false,
      remindersEnabled: plan.remindersEnabled ?? false,
      hideGlobalSponsors: plan.hideGlobalSponsors ?? false,
      localSponsorsEnabled: plan.localSponsorsEnabled ?? false,
      localSponsorsLimit: plan.localSponsorsLimit ?? 0,
      // Formatações
      priceMonthlyFormatted: this.formatCurrency(plan.priceMonthly),
      priceQuarterlyFormatted: plan.priceQuarterly ? this.formatCurrency(plan.priceQuarterly) : null,
      priceSemiannualFormatted: plan.priceSemiannual ? this.formatCurrency(plan.priceSemiannual) : null,
      priceAnnualFormatted: plan.priceAnnual ? this.formatCurrency(plan.priceAnnual) : null,
      annualSavings: plan.priceAnnual ? (plan.priceMonthly * 12) - plan.priceAnnual : 0,
    }));
  }

  private formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  }
}
