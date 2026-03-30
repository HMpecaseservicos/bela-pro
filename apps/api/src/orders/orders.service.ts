// LOJA UNIFICADA: Service de Pedidos (Orders)
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialService } from '../financial/financial.service';
import { z } from 'zod';

// ==================== SCHEMAS DE VALIDAÇÃO ====================

const createOrderSchema = z.object({
  clientId: z.string().cuid(),
  items: z
    .array(
      z.object({
        serviceId: z.string().cuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  linkedAppointmentId: z.string().cuid().optional(),
  notes: z.string().max(1000).optional(),
  bookedVia: z.enum(['admin', 'public', 'whatsapp']).default('admin'),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'PENDING_PAYMENT',
    'CONFIRMED',
    'READY',
    'DELIVERED',
    'CANCELLED',
  ]),
  cancelReason: z.string().max(500).optional(),
});

// ==================== SERVICE ====================

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FinancialService))
    private readonly financialService: FinancialService,
  ) {}

  /**
   * Cria um pedido com controle atômico de estoque
   */
  async create(workspaceId: string, input: unknown) {
    const data = createOrderSchema.parse(input);

    // Verificar que o workspace tem loja habilitada
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { shopEnabled: true },
    });

    if (!workspace?.shopEnabled) {
      throw new BadRequestException(
        'A loja não está habilitada neste workspace.',
      );
    }

    // Verificar que o cliente pertence ao workspace
    const client = await this.prisma.client.findFirst({
      where: { id: data.clientId, workspaceId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Buscar produtos (Service com itemType=PRODUCT)
    const serviceIds = data.items.map((i) => i.serviceId);
    const products = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        workspaceId,
        isActive: true,
        itemType: 'PRODUCT',
      },
    });

    if (products.length !== serviceIds.length) {
      throw new BadRequestException(
        'Um ou mais produtos não encontrados, inativos ou não são do tipo produto.',
      );
    }

    // Mapear quantidades
    const quantityMap = new Map(
      data.items.map((i) => [i.serviceId, i.quantity]),
    );

    // Verificar estoque disponível
    for (const product of products) {
      const qty = quantityMap.get(product.id) || 1;
      if (product.stock < qty) {
        throw new BadRequestException(
          `Estoque insuficiente para "${product.name}". Disponível: ${product.stock}, solicitado: ${qty}.`,
        );
      }
    }

    // Calcular totais
    const totalProductsCents = products.reduce((sum, p) => {
      const qty = quantityMap.get(p.id) || 1;
      return sum + p.priceCents * qty;
    }, 0);

    // TRANSAÇÃO ATÔMICA: criar pedido + decrementar estoque
    const order = await this.prisma.$transaction(async (tx) => {
      // Decrementar estoque com verificação pessimista
      for (const product of products) {
        const qty = quantityMap.get(product.id) || 1;
        const updated = await tx.service.updateMany({
          where: {
            id: product.id,
            workspaceId,
            stock: { gte: qty },
          },
          data: {
            stock: { decrement: qty },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            `Estoque insuficiente para "${product.name}". Tente novamente.`,
          );
        }
      }

      // Criar o pedido
      const newOrder = await tx.order.create({
        data: {
          workspaceId,
          clientId: data.clientId,
          status: 'PENDING',
          totalProductsCents,
          totalServicesCents: 0,
          totalCents: totalProductsCents,
          bookedVia: data.bookedVia,
          notes: data.notes,
          items: {
            create: products.map((p) => {
              const qty = quantityMap.get(p.id) || 1;
              return {
                serviceId: p.id,
                quantity: qty,
                priceCents: p.priceCents,
                totalCents: p.priceCents * qty,
              };
            }),
          },
        },
        include: {
          client: true,
          items: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  priceCents: true,
                },
              },
            },
          },
        },
      });

      // Vincular ao appointment se fornecido
      if (data.linkedAppointmentId) {
        await tx.appointment.updateMany({
          where: {
            id: data.linkedAppointmentId,
            workspaceId,
            linkedOrderId: null,
          },
          data: { linkedOrderId: newOrder.id },
        });
      }

      return newOrder;
    });

    this.logger.log(
      `✅ [${workspaceId}] Pedido criado: ${order.id} | ` +
        `cliente=${order.client.name} | total=R$${(order.totalCents / 100).toFixed(2)}`,
    );

    return order;
  }

  /**
   * Lista pedidos do workspace com filtros
   */
  async findAll(
    workspaceId: string,
    status?: string,
    from?: string,
    to?: string,
    limit?: number,
    offset?: number,
  ) {
    const where: any = { workspaceId };

    if (status) {
      where.status = status;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true, phoneE164: true },
          },
          items: {
            include: {
              service: {
                select: { id: true, name: true, imageUrl: true },
              },
            },
          },
          linkedAppointment: {
            select: { id: true, startAt: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit || 50,
        skip: offset || 0,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Busca um pedido por ID
   */
  async findOne(workspaceId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        items: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                priceCents: true,
                description: true,
              },
            },
          },
        },
        linkedAppointment: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            status: true,
            services: {
              include: {
                service: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido não encontrado.');
    }

    return order;
  }

  /**
   * Atualiza status do pedido
   */
  async updateStatus(workspaceId: string, id: string, input: unknown) {
    const data = updateOrderStatusSchema.parse(input);
    const order = await this.findOne(workspaceId, id);

    const updateData: any = { status: data.status };

    if (data.status === 'CANCELLED') {
      updateData.cancelledAt = new Date();
      updateData.cancelReason =
        data.cancelReason || 'Cancelado pelo profissional';

      // Restaurar estoque ao cancelar
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          await tx.service.updateMany({
            where: { id: item.serviceId, workspaceId },
            data: { stock: { increment: item.quantity } },
          });
        }

        await tx.order.updateMany({
          where: { id, workspaceId },
          data: updateData,
        });
      });

      this.logger.log(
        `✅ [${workspaceId}] Pedido ${id} cancelado. Estoque restaurado.`,
      );
      return this.findOne(workspaceId, id);
    }

    // Se confirmado/entregue → criar transação financeira
    if (data.status === 'DELIVERED') {
      updateData.paidAt = updateData.paidAt || new Date();
      updateData.paymentStatus = 'PAID';

      await this.prisma.order.updateMany({
        where: { id, workspaceId },
        data: updateData,
      });

      // Criar transação financeira para produtos
      try {
        await this.financialService.createTransactionFromOrder(
          workspaceId,
          id,
        );
        this.logger.log(
          `💰 [${workspaceId}] Transação financeira criada para pedido ${id}`,
        );
      } catch (err: any) {
        this.logger.warn(
          `⚠️ [${workspaceId}] Falha ao criar transação: ${err.message}`,
        );
      }

      return this.findOne(workspaceId, id);
    }

    await this.prisma.order.updateMany({
      where: { id, workspaceId },
      data: updateData,
    });

    this.logger.log(
      `✅ [${workspaceId}] Status do pedido ${id} alterado para ${data.status}`,
    );
    return this.findOne(workspaceId, id);
  }

  /**
   * Lista pedidos de um cliente específico
   */
  async findByClient(workspaceId: string, clientId: string) {
    return this.prisma.order.findMany({
      where: { workspaceId, clientId },
      include: {
        items: {
          include: {
            service: {
              select: { id: true, name: true, imageUrl: true },
            },
          },
        },
        linkedAppointment: {
          select: { id: true, startAt: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Dashboard: resumo de pedidos do workspace
   */
  async getDashboardSummary(workspaceId: string, from?: Date, to?: Date) {
    const where: any = { workspaceId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const [totalOrders, pendingOrders, deliveredOrders, revenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'PENDING_PAYMENT', 'CONFIRMED', 'READY'] },
        },
      }),
      this.prisma.order.count({
        where: { ...where, status: 'DELIVERED' },
      }),
      this.prisma.order.aggregate({
        where: {
          ...where,
          status: { in: ['CONFIRMED', 'READY', 'DELIVERED'] },
        },
        _sum: { totalProductsCents: true },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenueCents: revenue._sum.totalProductsCents || 0,
    };
  }
}
