import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schemas de validação
const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(10).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const createTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amountCents: z.number().int().positive(),
  description: z.string().min(1).max(200),
  notes: z.string().max(500).optional(),
  transactionDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  paymentMethod: z.enum(['PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER']).optional(),
  categoryId: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
});

const updateTransactionSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  notes: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  paymentMethod: z.enum(['PIX', 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER', 'OTHER']).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
});

// Categorias pré-definidas do sistema
const SYSTEM_CATEGORIES = {
  INCOME: [
    { name: 'Serviços', icon: '💅', color: '#10b981' },
    { name: 'Produtos', icon: '🛍️', color: '#3b82f6' },
    { name: 'Outros', icon: '💰', color: '#8b5cf6' },
  ],
  EXPENSE: [
    { name: 'Aluguel', icon: '🏠', color: '#ef4444' },
    { name: 'Luz', icon: '💡', color: '#f59e0b' },
    { name: 'Água', icon: '💧', color: '#06b6d4' },
    { name: 'Internet', icon: '📶', color: '#6366f1' },
    { name: 'Produtos', icon: '🧴', color: '#ec4899' },
    { name: 'Marketing', icon: '📣', color: '#14b8a6' },
    { name: 'Equipamentos', icon: '🔧', color: '#f97316' },
    { name: 'Impostos', icon: '📋', color: '#64748b' },
    { name: 'Funcionários', icon: '👥', color: '#a855f7' },
    { name: 'Outros', icon: '📦', color: '#78716c' },
  ],
};

@Injectable()
export class FinancialService {
  private readonly logger = new Logger(FinancialService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CATEGORIAS ====================

  /**
   * Inicializa categorias do sistema para um workspace
   */
  async initializeSystemCategories(workspaceId: string) {
    const existing = await this.prisma.financialCategory.count({
      where: { workspaceId, isSystem: true },
    });

    if (existing > 0) {
      return; // Já inicializado
    }

    const categories: Prisma.FinancialCategoryCreateManyInput[] = [];
    
    for (const cat of SYSTEM_CATEGORIES.INCOME) {
      categories.push({
        workspaceId,
        name: cat.name,
        type: 'INCOME',
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
      });
    }

    for (const cat of SYSTEM_CATEGORIES.EXPENSE) {
      categories.push({
        workspaceId,
        name: cat.name,
        type: 'EXPENSE',
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
      });
    }

    await this.prisma.financialCategory.createMany({
      data: categories,
      skipDuplicates: true,
    });

    this.logger.log(`✅ [${workspaceId}] Categorias financeiras inicializadas`);
  }

  async findAllCategories(workspaceId: string, type?: 'INCOME' | 'EXPENSE') {
    // Inicializa categorias se ainda não existem
    await this.initializeSystemCategories(workspaceId);

    return this.prisma.financialCategory.findMany({
      where: {
        workspaceId,
        isActive: true,
        ...(type && { type }),
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  async createCategory(workspaceId: string, input: unknown) {
    const data = createCategorySchema.parse(input);

    // Verifica se já existe categoria com esse nome
    const existing = await this.prisma.financialCategory.findUnique({
      where: {
        workspaceId_name_type: {
          workspaceId,
          name: data.name,
          type: data.type,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma categoria com esse nome.');
    }

    return this.prisma.financialCategory.create({
      data: {
        workspaceId,
        name: data.name,
        type: data.type,
        icon: data.icon,
        color: data.color,
        isSystem: false,
      },
    });
  }

  async deleteCategory(workspaceId: string, id: string) {
    const category = await this.prisma.financialCategory.findFirst({
      where: { id, workspaceId },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (category.isSystem) {
      throw new BadRequestException('Categorias do sistema não podem ser excluídas.');
    }

    // Soft delete - apenas desativa
    await this.prisma.financialCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ==================== TRANSAÇÕES ====================

  async findAllTransactions(
    workspaceId: string,
    options: {
      type?: 'INCOME' | 'EXPENSE';
      status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const where: Prisma.FinancialTransactionWhereInput = {
      workspaceId,
      ...(options.type && { type: options.type }),
      ...(options.status && { status: options.status }),
      ...(options.categoryId && { categoryId: options.categoryId }),
    };

    if (options.startDate || options.endDate) {
      where.transactionDate = {};
      if (options.startDate) {
        where.transactionDate.gte = new Date(options.startDate);
      }
      if (options.endDate) {
        where.transactionDate.lte = new Date(options.endDate);
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        include: {
          category: true,
          client: { select: { id: true, name: true } },
          appointment: {
            select: {
              id: true,
              startAt: true,
              services: {
                include: { service: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.financialTransaction.count({ where }),
    ]);

    return { transactions, total };
  }

  async findTransactionById(workspaceId: string, id: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id, workspaceId },
      include: {
        category: true,
        client: { select: { id: true, name: true, phoneE164: true } },
        appointment: {
          include: {
            services: {
              include: { service: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    return transaction;
  }

  async createTransaction(workspaceId: string, input: unknown) {
    const data = createTransactionSchema.parse(input);

    // Valida categoria se fornecida
    if (data.categoryId) {
      const category = await this.prisma.financialCategory.findFirst({
        where: { id: data.categoryId, workspaceId, type: data.type },
      });
      if (!category) {
        throw new BadRequestException('Categoria inválida.');
      }
    }

    // Valida cliente se fornecido
    if (data.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: data.clientId, workspaceId },
      });
      if (!client) {
        throw new BadRequestException('Cliente não encontrado.');
      }
    }

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        workspaceId,
        type: data.type,
        status: data.status || 'COMPLETED',
        amountCents: data.amountCents,
        description: data.description,
        notes: data.notes,
        transactionDate: new Date(data.transactionDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        completedAt: data.status !== 'PENDING' ? new Date(data.transactionDate) : null,
        paymentMethod: data.paymentMethod,
        categoryId: data.categoryId,
        clientId: data.clientId,
      },
      include: {
        category: true,
        client: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `✅ [${workspaceId}] Transação criada: ${transaction.id} | ${data.type} | ${data.amountCents / 100}`
    );

    return transaction;
  }

  async updateTransaction(workspaceId: string, id: string, input: unknown) {
    const data = updateTransactionSchema.parse(input);

    const existing = await this.prisma.financialTransaction.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Transação não encontrada.');
    }

    // Não permite editar transações vinculadas a agendamentos
    if (existing.appointmentId) {
      throw new BadRequestException(
        'Transações vinculadas a agendamentos não podem ser editadas diretamente.'
      );
    }

    const updateData: Prisma.FinancialTransactionUpdateInput = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.transactionDate !== undefined) updateData.transactionDate = new Date(data.transactionDate);
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.paymentMethod !== undefined) updateData.paymentMethod = data.paymentMethod;
    if (data.categoryId !== undefined) {
      updateData.category = data.categoryId 
        ? { connect: { id: data.categoryId } } 
        : { disconnect: true };
    }
    if (data.status !== undefined) {
      updateData.status = data.status;
      if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      }
    }

    return this.prisma.financialTransaction.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        client: { select: { id: true, name: true } },
      },
    });
  }

  async deleteTransaction(workspaceId: string, id: string) {
    const existing = await this.prisma.financialTransaction.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      throw new NotFoundException('Transação não encontrada.');
    }

    // Não permite excluir transações vinculadas a agendamentos
    if (existing.appointmentId) {
      throw new BadRequestException(
        'Transações vinculadas a agendamentos não podem ser excluídas diretamente.'
      );
    }

    await this.prisma.financialTransaction.delete({
      where: { id },
    });

    return { success: true };
  }

  // ==================== MÉTRICAS E DASHBOARD ====================

  async getDashboard(
    workspaceId: string,
    options: {
      startDate: string;
      endDate: string;
    }
  ) {
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    // Busca todas as transações do período
    const transactions = await this.prisma.financialTransaction.findMany({
      where: {
        workspaceId,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { not: 'CANCELLED' },
      },
      include: {
        category: true,
      },
    });

    // Calcula totais
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory: Record<string, { name: string; total: number; color: string }> = {};
    const expenseByCategory: Record<string, { name: string; total: number; color: string }> = {};
    const dailyData: Record<string, { income: number; expense: number }> = {};
    const paymentMethods: Record<string, number> = {};

    for (const t of transactions) {
      const dateKey = t.transactionDate.toISOString().split('T')[0];
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { income: 0, expense: 0 };
      }

      if (t.type === 'INCOME') {
        totalIncome += t.amountCents;
        dailyData[dateKey].income += t.amountCents;
        
        if (t.category) {
          if (!incomeByCategory[t.category.id]) {
            incomeByCategory[t.category.id] = {
              name: t.category.name,
              total: 0,
              color: t.category.color || '#10b981',
            };
          }
          incomeByCategory[t.category.id].total += t.amountCents;
        }
      } else {
        totalExpense += t.amountCents;
        dailyData[dateKey].expense += t.amountCents;
        
        if (t.category) {
          if (!expenseByCategory[t.category.id]) {
            expenseByCategory[t.category.id] = {
              name: t.category.name,
              total: 0,
              color: t.category.color || '#ef4444',
            };
          }
          expenseByCategory[t.category.id].total += t.amountCents;
        }
      }

      if (t.paymentMethod) {
        paymentMethods[t.paymentMethod] = (paymentMethods[t.paymentMethod] || 0) + t.amountCents;
      }
    }

    // Busca agendamentos concluídos do período para calcular ticket médio
    const completedAppointments = await this.prisma.appointment.findMany({
      where: {
        workspaceId,
        status: 'COMPLETED',
        startAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { totalPriceCents: true },
    });

    const totalAppointmentRevenue = completedAppointments.reduce(
      (sum, a) => sum + a.totalPriceCents,
      0
    );
    const averageTicket =
      completedAppointments.length > 0
        ? Math.round(totalAppointmentRevenue / completedAppointments.length)
        : 0;

    // Transações pendentes
    const pendingCount = await this.prisma.financialTransaction.count({
      where: {
        workspaceId,
        status: 'PENDING',
        dueDate: { lte: new Date() },
      },
    });

    return {
      period: {
        startDate: options.startDate,
        endDate: options.endDate,
      },
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        profit: totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0,
      },
      appointments: {
        completed: completedAppointments.length,
        revenue: totalAppointmentRevenue,
        averageTicket,
      },
      pending: {
        count: pendingCount,
      },
      incomeByCategory: Object.values(incomeByCategory).sort((a, b) => b.total - a.total),
      expenseByCategory: Object.values(expenseByCategory).sort((a, b) => b.total - a.total),
      dailyData: Object.entries(dailyData)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      paymentMethods: Object.entries(paymentMethods).map(([method, total]) => ({
        method,
        total,
      })),
    };
  }

  // ==================== INTEGRAÇÃO COM AGENDAMENTOS ====================

  /**
   * Cria transação financeira automática quando um agendamento é concluído
   */
  async createTransactionFromAppointment(
    workspaceId: string,
    appointmentId: string,
    paymentMethod?: 'PIX' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'OTHER'
  ) {
    // Verifica se já existe transação para este agendamento
    const existing = await this.prisma.financialTransaction.findUnique({
      where: { appointmentId },
    });

    if (existing) {
      return existing;
    }

    // Busca o agendamento completo
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, workspaceId },
      include: {
        client: { select: { id: true, name: true } },
        services: {
          include: { service: { select: { name: true } } },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    // Busca categoria "Serviços" para receitas
    let serviceCategory = await this.prisma.financialCategory.findFirst({
      where: { workspaceId, name: 'Serviços', type: 'INCOME' },
    });

    if (!serviceCategory) {
      await this.initializeSystemCategories(workspaceId);
      serviceCategory = await this.prisma.financialCategory.findFirst({
        where: { workspaceId, name: 'Serviços', type: 'INCOME' },
      });
    }

    const serviceNames = appointment.services.map(s => s.service.name).join(', ');

    const transaction = await this.prisma.financialTransaction.create({
      data: {
        workspaceId,
        type: 'INCOME',
        status: 'COMPLETED',
        amountCents: appointment.totalPriceCents,
        description: `${serviceNames} - ${appointment.client.name}`,
        transactionDate: appointment.startAt,
        completedAt: new Date(),
        paymentMethod: paymentMethod || 'OTHER',
        categoryId: serviceCategory?.id,
        appointmentId: appointment.id,
        clientId: appointment.client.id,
      },
      include: {
        category: true,
        client: { select: { id: true, name: true } },
      },
    });

    this.logger.log(
      `✅ [${workspaceId}] Transação criada do agendamento ${appointmentId}: R$ ${appointment.totalPriceCents / 100}`
    );

    return transaction;
  }
}
