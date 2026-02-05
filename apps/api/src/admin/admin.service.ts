import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

// ============================================================================
// Schemas de validação
// ============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

const updateWorkspaceAdminSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).optional(),
  chatbotEnabled: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateUserAdminSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().max(120).optional(),
  isActive: z.boolean().optional(),
  isSuperAdmin: z.boolean().optional(),
});

const createSuperAdminSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(8).max(200),
});

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // DASHBOARD / ESTATÍSTICAS
  // ==========================================================================

  /**
   * Retorna estatísticas gerais do sistema
   */
  async getDashboardStats() {
    const [
      totalWorkspaces,
      activeWorkspaces,
      totalUsers,
      activeUsers,
      totalAppointments,
      appointmentsThisMonth,
      workspacesByPlan,
      recentWorkspaces,
    ] = await Promise.all([
      this.prisma.workspace.count(),
      this.prisma.workspace.count({ where: { memberships: { some: { isActive: true } } } }),
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.appointment.count(),
      this.prisma.appointment.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      this.prisma.workspace.groupBy({
        by: ['plan'],
        _count: { plan: true },
      }),
      this.prisma.workspace.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          createdAt: true,
          _count: { select: { appointments: true, clients: true } },
        },
      }),
    ]);

    return {
      overview: {
        totalWorkspaces,
        activeWorkspaces,
        totalUsers,
        activeUsers,
        totalAppointments,
        appointmentsThisMonth,
      },
      workspacesByPlan: workspacesByPlan.reduce(
        (acc, item) => ({ ...acc, [item.plan]: item._count.plan }),
        {} as Record<string, number>,
      ),
      recentWorkspaces,
    };
  }

  // ==========================================================================
  // WORKSPACES
  // ==========================================================================

  /**
   * Lista todos os workspaces com paginação e busca
   */
  async listWorkspaces(query: unknown) {
    const { page, limit, search } = paginationSchema.parse(query);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { slug: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          chatbotEnabled: true,
          createdAt: true,
          updatedAt: true,
          whatsappLastConnectionState: true,
          _count: {
            select: {
              memberships: true,
              appointments: true,
              clients: true,
              services: true,
            },
          },
        },
      }),
      this.prisma.workspace.count({ where }),
    ]);

    return {
      data: workspaces,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca detalhes completos de um workspace
   */
  async getWorkspaceDetails(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        profile: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, isActive: true },
            },
          },
        },
        _count: {
          select: {
            appointments: true,
            clients: true,
            services: true,
            scheduleRules: true,
            conversations: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    // Busca estatísticas de uso do mês atual
    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const chatUsage = await this.prisma.chatUsage.findUnique({
      where: { workspaceId_yearMonth: { workspaceId, yearMonth: currentYearMonth } },
    });

    return {
      ...workspace,
      currentMonthUsage: chatUsage,
    };
  }

  /**
   * Atualiza configurações administrativas de um workspace
   */
  async updateWorkspace(workspaceId: string, input: unknown) {
    const data = updateWorkspaceAdminSchema.parse(input);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data,
      include: { profile: true },
    });
  }

  /**
   * Deleta um workspace (soft delete via desativação de memberships)
   */
  async deleteWorkspace(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    // Soft delete: desativa todas as memberships
    await this.prisma.membership.updateMany({
      where: { workspaceId },
      data: { isActive: false },
    });

    return { success: true, message: 'Workspace desativado com sucesso' };
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  /**
   * Lista todos os usuários com paginação
   */
  async listUsers(query: unknown) {
    const { page, limit, search } = paginationSchema.parse(query);
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          isSuperAdmin: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            select: {
              role: true,
              isActive: true,
              workspace: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca detalhes de um usuário
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        memberships: {
          include: {
            workspace: {
              select: { id: true, name: true, slug: true, plan: true },
            },
          },
        },
        auditLogs: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  /**
   * Atualiza dados de um usuário
   */
  async updateUser(userId: string, input: unknown, currentUserId: string) {
    const data = updateUserAdminSchema.parse(input);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Impede que super admin remova seu próprio status
    if (userId === currentUserId && data.isSuperAdmin === false) {
      throw new BadRequestException('Você não pode remover seu próprio status de Super Admin');
    }

    // Se mudar email, verifica duplicata
    if (data.email && data.email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await this.prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (existing) {
        throw new BadRequestException('Este email já está em uso');
      }
      data.email = data.email.toLowerCase();
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Cria um novo Super Admin
   */
  async createSuperAdmin(input: unknown, hashFn: (password: string) => Promise<string>) {
    const data = createSuperAdminSchema.parse(input);
    const email = data.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email já cadastrado');
    }

    const passwordHash = await hashFn(data.password);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email,
        passwordHash,
        isSuperAdmin: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });
  }

  // ==========================================================================
  // BILLING / USAGE
  // ==========================================================================

  /**
   * Lista uso de chat por workspace (billing)
   */
  async listChatUsage(query: unknown) {
    const { page, limit } = paginationSchema.parse(query);
    const skip = (page - 1) * limit;

    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const [usages, total] = await Promise.all([
      this.prisma.chatUsage.findMany({
        where: { yearMonth: currentYearMonth },
        skip,
        take: limit,
        orderBy: { conversationsUsed: 'desc' },
        include: {
          workspace: {
            select: { id: true, name: true, slug: true, plan: true },
          },
        },
      }),
      this.prisma.chatUsage.count({ where: { yearMonth: currentYearMonth } }),
    ]);

    return {
      yearMonth: currentYearMonth,
      data: usages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ajusta limite de conversas para um workspace
   */
  async adjustChatLimit(workspaceId: string, newLimit: number) {
    if (newLimit < 0 || !Number.isInteger(newLimit)) {
      throw new BadRequestException('Limite deve ser um número inteiro positivo');
    }

    const currentYearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    return this.prisma.chatUsage.upsert({
      where: { workspaceId_yearMonth: { workspaceId, yearMonth: currentYearMonth } },
      update: { conversationsLimit: newLimit },
      create: {
        workspaceId,
        yearMonth: currentYearMonth,
        conversationsLimit: newLimit,
        conversationsUsed: 0,
      },
    });
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  /**
   * Lista logs de auditoria globais
   */
  async listAuditLogs(query: unknown) {
    const { page, limit } = paginationSchema.parse(query);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          workspace: { select: { id: true, name: true, slug: true } },
          actorUser: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================================================
  // IMPERSONAR WORKSPACE
  // ==========================================================================

  /**
   * Gera token para super admin acessar qualquer workspace como owner
   */
  async impersonateWorkspace(superAdminUserId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    // Retorna dados necessários para gerar token
    return {
      userId: superAdminUserId,
      workspaceId: workspace.id,
      role: 'OWNER' as const,
      isSuperAdmin: true,
      workspace,
    };
  }

  // ==========================================================================
  // MÉTRICAS DE CRESCIMENTO
  // ==========================================================================

  /**
   * Retorna métricas de crescimento por período
   */
  async getGrowthMetrics(query: { period?: 'week' | 'month' | 'quarter' | 'year' }) {
    const period = query.period || 'month';
    
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));

    const [
      newWorkspaces,
      previousWorkspaces,
      newUsers,
      previousUsers,
      newAppointments,
      previousAppointments,
      newClients,
      previousClients,
      topWorkspaces,
      appointmentsByStatus,
    ] = await Promise.all([
      // Novos workspaces no período
      this.prisma.workspace.count({
        where: { createdAt: { gte: startDate } },
      }),
      // Workspaces período anterior
      this.prisma.workspace.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
      // Novos usuários
      this.prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
      // Novos agendamentos
      this.prisma.appointment.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.appointment.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
      // Novos clientes
      this.prisma.client.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.client.count({
        where: { createdAt: { gte: previousStartDate, lt: startDate } },
      }),
      // Top workspaces por agendamentos
      this.prisma.workspace.findMany({
        take: 10,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          _count: {
            select: {
              appointments: {
                where: { createdAt: { gte: startDate } },
              },
            },
          },
        },
        orderBy: {
          appointments: { _count: 'desc' },
        },
      }),
      // Agendamentos por status
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { createdAt: { gte: startDate } },
        _count: { status: true },
      }),
    ]);

    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      period,
      startDate,
      endDate: now,
      metrics: {
        workspaces: {
          current: newWorkspaces,
          previous: previousWorkspaces,
          growth: calcGrowth(newWorkspaces, previousWorkspaces),
        },
        users: {
          current: newUsers,
          previous: previousUsers,
          growth: calcGrowth(newUsers, previousUsers),
        },
        appointments: {
          current: newAppointments,
          previous: previousAppointments,
          growth: calcGrowth(newAppointments, previousAppointments),
        },
        clients: {
          current: newClients,
          previous: previousClients,
          growth: calcGrowth(newClients, previousClients),
        },
      },
      topWorkspaces: topWorkspaces.map(w => ({
        ...w,
        appointmentsCount: w._count.appointments,
        _count: undefined,
      })),
      appointmentsByStatus: appointmentsByStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count.status }),
        {} as Record<string, number>,
      ),
    };
  }

  // ==========================================================================
  // CONFIGURAÇÕES DE PLANOS
  // ==========================================================================

  /**
   * Retorna configuração de limites por plano
   */
  getPlanLimits() {
    return {
      FREE: {
        conversationsLimit: 50,
        features: ['basic_booking'],
      },
      BASIC: {
        conversationsLimit: 500,
        features: ['basic_booking', 'chatbot', 'reminders'],
      },
      PRO: {
        conversationsLimit: 2000,
        features: ['basic_booking', 'chatbot', 'reminders', 'reports', 'priority_support'],
      },
      ENTERPRISE: {
        conversationsLimit: -1, // Ilimitado
        features: ['all'],
      },
    };
  }

  /**
   * Atualiza plano de múltiplos workspaces
   */
  async bulkUpdatePlan(workspaceIds: string[], plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE') {
    const updated = await this.prisma.workspace.updateMany({
      where: { id: { in: workspaceIds } },
      data: { plan },
    });

    return {
      updated: updated.count,
      plan,
    };
  }

  // ==========================================================================
  // EXPORTAÇÃO DE DADOS
  // ==========================================================================

  /**
   * Exporta lista de workspaces em formato CSV
   */
  async exportWorkspacesCSV() {
    const workspaces = await this.prisma.workspace.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        chatbotEnabled: true,
        createdAt: true,
        whatsappLastConnectionState: true,
        _count: {
          select: {
            memberships: true,
            appointments: true,
            clients: true,
            services: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'ID',
      'Nome',
      'Slug',
      'Plano',
      'Chatbot',
      'WhatsApp',
      'Membros',
      'Agendamentos',
      'Clientes',
      'Serviços',
      'Criado em',
    ];

    const rows = workspaces.map(w => [
      w.id,
      w.name,
      w.slug,
      w.plan,
      w.chatbotEnabled ? 'Sim' : 'Não',
      w.whatsappLastConnectionState || 'Não conectado',
      w._count.memberships,
      w._count.appointments,
      w._count.clients,
      w._count.services,
      w.createdAt.toISOString(),
    ]);

    return {
      headers,
      rows,
      csv: [headers.join(','), ...rows.map(r => r.join(','))].join('\n'),
    };
  }

  /**
   * Exporta lista de usuários em formato CSV
   */
  async exportUsersCSV() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isSuperAdmin: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            workspace: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['ID', 'Nome', 'Email', 'Ativo', 'Super Admin', 'Workspaces', 'Criado em'];

    const rows = users.map(u => [
      u.id,
      u.name,
      u.email,
      u.isActive ? 'Sim' : 'Não',
      u.isSuperAdmin ? 'Sim' : 'Não',
      u.memberships.map(m => `${m.workspace.name} (${m.role})`).join('; '),
      u.createdAt.toISOString(),
    ]);

    return {
      headers,
      rows,
      csv: [headers.join(','), ...rows.map(r => r.join(','))].join('\n'),
    };
  }

  // ==========================================================================
  // NOTIFICAÇÕES BROADCAST
  // ==========================================================================

  /**
   * Lista todos os owners de workspace para broadcast
   */
  async listBroadcastTargets() {
    const owners = await this.prisma.membership.findMany({
      where: { role: 'OWNER', isActive: true },
      select: {
        user: {
          select: { id: true, name: true, email: true },
        },
        workspace: {
          select: { id: true, name: true, plan: true },
        },
      },
    });

    return owners.map(o => ({
      userId: o.user.id,
      userName: o.user.name,
      userEmail: o.user.email,
      workspaceId: o.workspace.id,
      workspaceName: o.workspace.name,
      workspacePlan: o.workspace.plan,
    }));
  }

  /**
   * Registra uma notificação broadcast (para ser enviada por job assíncrono)
   */
  async createBroadcast(input: {
    title: string;
    message: string;
    targetPlans?: ('FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE')[];
    scheduledAt?: Date;
  }) {
    // Por enquanto, apenas retorna os targets
    // Implementação completa requer tabela de broadcasts
    const targets = await this.listBroadcastTargets();
    
    const filteredTargets = input.targetPlans
      ? targets.filter(t => input.targetPlans!.includes(t.workspacePlan as any))
      : targets;

    return {
      title: input.title,
      message: input.message,
      targetCount: filteredTargets.length,
      scheduledAt: input.scheduledAt || new Date(),
      targets: filteredTargets,
    };
  }

  // ==========================================================================
  // HEALTH CHECK DO SISTEMA
  // ==========================================================================

  /**
   * Retorna status de saúde do sistema
   */
  async getSystemHealth() {
    const [
      dbStatus,
      workspacesWithWhatsApp,
      activeConversations,
      pendingNotifications,
    ] = await Promise.all([
      // Teste de conexão DB
      this.prisma.$queryRaw`SELECT 1 as ok`.then(() => 'healthy').catch(() => 'unhealthy'),
      // Workspaces com WhatsApp conectado
      this.prisma.workspace.count({
        where: { whatsappLastConnectionState: 'open' },
      }),
      // Conversas ativas (últimas 24h)
      this.prisma.chatbotConversation.count({
        where: {
          updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      // Notificações pendentes
      this.prisma.notificationJob.count({
        where: { status: 'SCHEDULED' },
      }),
    ]);

    return {
      status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      components: {
        database: dbStatus,
        whatsapp: {
          connectedWorkspaces: workspacesWithWhatsApp,
        },
        chatbot: {
          activeConversations24h: activeConversations,
        },
        notifications: {
          pending: pendingNotifications,
        },
      },
    };
  }
}
