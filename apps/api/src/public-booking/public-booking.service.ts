import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { normalizePhoneE164 } from '../utils/phone.util';
import {
  generatePixCode,
  generatePixQrCode,
  generatePixTxId,
} from '../common/pix.utils';
import { z } from 'zod';

const createPublicBookingSchema = z.object({
  workspaceId: z.string().min(1),
  clientName: z.string().min(2).max(80),
  clientPhone: z.string().min(10).max(20),
  serviceIds: z.array(z.string().min(1)).min(1).max(10),
  startAt: z.string().datetime(),
});

@Injectable()
export class PublicBookingService {
  private readonly logger = new Logger(PublicBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async createBooking(input: unknown) {
    const data = createPublicBookingSchema.parse(input);
    const startAt = new Date(data.startAt);

    // Valida que workspace existe
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace não encontrado.');
    }

    // Valida que todos os serviços existem e pertencem ao workspace
    // TENANT ISOLATION: findMany com workspaceId no WHERE para evitar enumeração de IDs
    const services = await this.prisma.service.findMany({
      where: { 
        id: { in: data.serviceIds }, 
        workspaceId: data.workspaceId, 
        isActive: true 
      },
    });

    if (services.length !== data.serviceIds.length) {
      throw new BadRequestException('Um ou mais serviços não encontrados ou inativos.');
    }

    // Valida que são apenas serviços (não produtos)
    const nonServiceItems = services.filter(s => (s as any).itemType && (s as any).itemType !== 'SERVICE');
    if (nonServiceItems.length > 0) {
      throw new BadRequestException('Produtos não podem ser agendados. Use o checkout unificado.');
    }

    // Calcula duração total (soma das durações) e preço total
    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const totalPriceCents = services.reduce((sum, s) => sum + s.priceCents, 0);

    // Calcula fim do agendamento
    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60000);

    // Verifica conflitos
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        workspaceId: data.workspaceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            AND: [
              { startAt: { lt: endAt } },
              { endAt: { gt: startAt } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Horário indisponível.');
    }

    // Normaliza telefone para formato E.164 consistente
    const phoneE164 = normalizePhoneE164(data.clientPhone);

    // Busca ou cria cliente
    let client = await this.prisma.client.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: data.workspaceId,
          phoneE164,
        },
      },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.clientName,
          phoneE164,
          status: 'NORMAL',
        },
      });
    } else if (client.name !== data.clientName) {
      client = await this.prisma.client.update({
        where: { id: client.id },
        data: { name: data.clientName },
      });
    }

    // Verifica se workspace exige pagamento
    const requiresPayment = workspace.requirePayment && workspace.paymentType !== 'NONE';
    const appointmentStatus = requiresPayment ? 'PENDING_PAYMENT' : 'PENDING';

    // Cria agendamento com múltiplos serviços
    const appointment = await this.prisma.appointment.create({
      data: {
        workspaceId: data.workspaceId,
        clientId: client.id,
        startAt,
        endAt,
        status: appointmentStatus,
        bookedVia: 'public',
        totalPriceCents,
        services: {
          create: services.map(s => ({
            serviceId: s.id,
            durationMinutes: s.durationMinutes,
            priceCents: s.priceCents,
          })),
        },
      },
      include: {
        client: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    // Se requer pagamento, cria registro de Payment
    let paymentInfo = null;
    if (requiresPayment) {
      const payment = await this.paymentsService.createPaymentForAppointment(
        appointment.id,
        data.workspaceId,
        totalPriceCents
      );
      
      if (payment) {
        // Formatar resposta no formato esperado pelo frontend
        paymentInfo = {
          paymentId: payment.id,
          appointmentId: appointment.id,
          amountCents: payment.amountCents,
          pixCode: payment.pixCode || '',
          pixRecipientName: payment.workspace?.pixHolderName || '',
          pixKeyMasked: this.maskPixKey(payment.workspace?.pixKey, payment.workspace?.pixKeyType),
          expiresAt: payment.expiresAt.toISOString(),
        };
      }
    }

    this.logger.log(
      `✅ [${data.workspaceId}] Agendamento público criado: ${appointment.id} | ` +
      `cliente=${appointment.client.name} phone=${appointment.client.phoneE164} | ` +
      `status=${appointmentStatus}${paymentInfo ? ` | payment=${paymentInfo.paymentId}` : ''}`
    );

    return {
      ...appointment,
      paymentInfo,
      requiresPayment,
    };
  }

  /**
   * Gera PIX diretamente no Order (para pedidos somente-produto sem appointment)
   */
  private async generatePixForOrder(
    order: any,
    workspaceId: string,
    workspace: any,
  ) {
    if (!workspace.pixKey || !workspace.pixKeyType || !workspace.pixHolderName) {
      return null;
    }

    const partialFixedCents = workspace.partialFixedAmount
      ? Math.round(Number(workspace.partialFixedAmount) * 100)
      : null;

    const amountCents = this.paymentsService.calculatePaymentAmount(
      order.totalCents,
      workspace.paymentType,
      workspace.partialPercent,
      partialFixedCents,
    );

    if (amountCents <= 0) return null;

    const pixTxId = generatePixTxId();
    const pixCode = generatePixCode(
      {
        key: workspace.pixKey,
        keyType: workspace.pixKeyType,
        holderName: workspace.pixHolderName,
        city: workspace.pixCity || 'Brasil',
      },
      amountCents,
      pixTxId,
      'Pedido BELA PRO',
    );
    const pixQrBase64 = await generatePixQrCode(pixCode);

    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + (workspace.paymentExpiryMinutes || 30),
    );

    // Atualizar Order com dados PIX
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        pixCode,
        pixQrBase64,
        pixTxId,
        paymentStatus: 'PENDING',
        status: 'PENDING_PAYMENT',
        expiresAt,
      },
    });

    return {
      paymentId: order.id,
      orderId: order.id,
      amountCents,
      pixCode,
      pixRecipientName: workspace.pixHolderName || '',
      pixKeyMasked: this.maskPixKey(workspace.pixKey, workspace.pixKeyType),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Mascara a chave PIX para exibição pública
   */
  private maskPixKey(pixKey?: string | null, pixKeyType?: string | null): string {
    if (!pixKey) return '';
    
    switch (pixKeyType) {
      case 'CPF':
        // 123.456.789-00 -> ***.***.789-**
        return pixKey.replace(/(\d{3})\.?(\d{3})\.?(\d{3})-?(\d{2})/, '***.***.***-**').slice(0, 14);
      case 'CNPJ':
        // 12.345.678/0001-00 -> **.***.***/****-**
        return '**.***.***/****-**';
      case 'EMAIL':
        // email@domain.com -> em***@do***.com
        const [local, domain] = pixKey.split('@');
        if (!domain) return '***@***.***';
        return `${local.slice(0, 2)}***@${domain.slice(0, 2)}***.${domain.split('.').pop()}`;
      case 'PHONE':
        // +5511999999999 -> +55 ** *****-9999
        return `+55 ** *****-${pixKey.slice(-4)}`;
      case 'RANDOM':
        // Chave aleatória -> mostra só início e fim
        return `${pixKey.slice(0, 4)}...${pixKey.slice(-4)}`;
      default:
        return '***';
    }
  }

  // ==================== CONSULTA PÚBLICA ====================

  /**
   * Busca agendamento pelo ID e telefone (validação de propriedade)
   */
  async findByIdAndPhone(id: string, phone: string) {
    const phoneE164 = normalizePhoneE164(phone);
    
    const appointment = await this.prisma.appointment.findFirst({
      where: { 
        id,
        client: { phoneE164 },
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            brandName: true,
            slug: true,
          },
        },
        client: {
          select: {
            name: true,
            phoneE164: true,
          },
        },
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                durationMinutes: true,
                priceCents: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado ou telefone não confere.');
    }

    return appointment;
  }

  // ==================== REAGENDAMENTO PÚBLICO ====================

  private readonly reschedulePublicSchema = z.object({
    phone: z.string().min(10).max(20),
    newStartAt: z.string().datetime(),
  });

  /**
   * Reagenda um agendamento público (cliente valida por telefone)
   */
  async reschedulePublic(id: string, input: unknown) {
    const data = this.reschedulePublicSchema.parse(input);
    const phoneE164 = normalizePhoneE164(data.phone);
    const newStartAt = new Date(data.newStartAt);

    // Busca o agendamento e valida propriedade pelo telefone
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        client: { phoneE164 },
      },
      include: {
        services: {
          include: { service: true },
        },
        workspace: true,
        client: true,
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado ou telefone não confere.');
    }

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('Este agendamento não pode ser reagendado.');
    }

    // Verifica se está dentro do prazo permitido (ex: pelo menos 2h antes)
    const minHoursBefore = 2;
    const now = new Date();
    const minAllowed = new Date(appointment.startAt.getTime() - minHoursBefore * 60 * 60 * 1000);
    if (now > minAllowed) {
      throw new BadRequestException(
        `Reagendamentos devem ser feitos com pelo menos ${minHoursBefore} horas de antecedência.`
      );
    }

    // Calcula nova duração total baseada nos serviços existentes
    const totalDurationMinutes = appointment.services.reduce((sum, as) => sum + as.durationMinutes, 0);
    const newEndAt = new Date(newStartAt.getTime() + totalDurationMinutes * 60000);

    // Verifica conflitos (excluindo o próprio agendamento)
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        workspaceId: appointment.workspaceId,
        id: { not: id },
        status: { in: ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'] },
        AND: [{ startAt: { lt: newEndAt } }, { endAt: { gt: newStartAt } }],
      },
    });

    if (conflicts.length > 0) {
      throw new ConflictException('Já existe um agendamento neste horário.');
    }

    // Atualiza o agendamento
    await this.prisma.appointment.update({
      where: { id },
      data: {
        startAt: newStartAt,
        endAt: newEndAt,
      },
    });

    this.logger.log(
      `✅ [${appointment.workspaceId}] Reagendamento público: ${id} | ` +
      `cliente=${appointment.client.name} | novo horário=${newStartAt.toISOString()}`
    );

    return this.findByIdAndPhone(id, data.phone);
  }

  // ==================== CANCELAMENTO PÚBLICO ====================

  private readonly cancelPublicSchema = z.object({
    phone: z.string().min(10).max(20),
    reason: z.string().max(500).optional(),
  });

  /**
   * Cancela um agendamento público (cliente valida por telefone)
   */
  async cancelPublic(id: string, input: unknown) {
    const data = this.cancelPublicSchema.parse(input);
    const phoneE164 = normalizePhoneE164(data.phone);

    // Busca o agendamento e valida propriedade pelo telefone
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        client: { phoneE164 },
      },
      include: {
        workspace: true,
        client: true,
      },
    });

    if (!appointment) {
      throw new BadRequestException('Agendamento não encontrado ou telefone não confere.');
    }

    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      throw new BadRequestException('Este agendamento já foi finalizado.');
    }

    // Verifica se está dentro do prazo permitido (ex: pelo menos 2h antes)
    const minHoursBefore = 2;
    const now = new Date();
    const minAllowed = new Date(appointment.startAt.getTime() - minHoursBefore * 60 * 60 * 1000);
    if (now > minAllowed) {
      throw new BadRequestException(
        `Cancelamentos devem ser feitos com pelo menos ${minHoursBefore} horas de antecedência.`
      );
    }

    // Cancela o agendamento
    await this.prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: data.reason ? `Cancelado pelo cliente: ${data.reason}` : 'Cancelado pelo cliente',
      },
    });

    this.logger.log(
      `✅ [${appointment.workspaceId}] Cancelamento público: ${id} | ` +
      `cliente=${appointment.client.name}`
    );

    return { success: true, message: 'Agendamento cancelado com sucesso.' };
  }

  // ==================== LOJA UNIFICADA: CHECKOUT PÚBLICO ====================

  private readonly unifiedCheckoutSchema = z.object({
    workspaceId: z.string().min(1),
    clientName: z.string().min(2).max(80),
    clientPhone: z.string().min(10).max(20),
    // Serviços para agendar (opcional)
    serviceIds: z.array(z.string().min(1)).max(10).default([]),
    startAt: z.string().datetime().optional(),
    // Produtos para comprar (opcional)
    products: z
      .array(
        z.object({
          serviceId: z.string().min(1),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .max(50)
      .default([]),
  });

  /**
   * Checkout unificado: cria appointment (se houver serviços) + order (se houver produtos)
   * vinculados entre si. Reutiliza 100% da lógica existente de pagamento PIX.
   */
  async unifiedCheckout(input: unknown) {
    const data = this.unifiedCheckoutSchema.parse(input);

    const hasServices = data.serviceIds.length > 0;
    const hasProducts = data.products.length > 0;

    if (!hasServices && !hasProducts) {
      throw new BadRequestException(
        'Selecione pelo menos um serviço ou produto.',
      );
    }

    if (hasServices && !data.startAt) {
      throw new BadRequestException(
        'Data/hora é obrigatória quando há serviços selecionados.',
      );
    }

    // Validar workspace
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace não encontrado.');
    }

    // Se tem produtos, workspace precisa ter loja habilitada
    if (hasProducts && workspace.businessMode === 'BOOKING') {
      throw new BadRequestException(
        'A loja não está habilitada neste workspace.',
      );
    }

    const phoneE164 = normalizePhoneE164(data.clientPhone);

    // Busca ou cria cliente
    let client = await this.prisma.client.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: data.workspaceId,
          phoneE164,
        },
      },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          workspaceId: data.workspaceId,
          name: data.clientName,
          phoneE164,
          status: 'NORMAL',
        },
      });
    } else if (client.name !== data.clientName) {
      client = await this.prisma.client.update({
        where: { id: client.id },
        data: { name: data.clientName },
      });
    }

    let appointment: any = null;
    let order: any = null;
    let paymentInfo: any = null;

    // TRANSAÇÃO ATÔMICA para garantir consistência
    const result = await this.prisma.$transaction(async (tx) => {
      // ── CRIAR APPOINTMENT (se houver serviços) ──
      if (hasServices) {
        const services = await tx.service.findMany({
          where: {
            id: { in: data.serviceIds },
            workspaceId: data.workspaceId,
            isActive: true,
            itemType: 'SERVICE',
          },
        });

        if (services.length !== data.serviceIds.length) {
          throw new BadRequestException(
            'Um ou mais serviços não encontrados ou inativos.',
          );
        }

        const totalDurationMinutes = services.reduce(
          (sum, s) => sum + s.durationMinutes,
          0,
        );
        const startAt = new Date(data.startAt!);
        const endAt = new Date(
          startAt.getTime() + totalDurationMinutes * 60000,
        );

        // Verificar conflitos
        const conflicts = await tx.appointment.findMany({
          where: {
            workspaceId: data.workspaceId,
            status: { in: ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT'] },
            AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
          },
        });

        if (conflicts.length > 0) {
          throw new BadRequestException('Horário indisponível.');
        }

        const totalServicesCents = services.reduce(
          (sum, s) => sum + s.priceCents,
          0,
        );
        const requiresPayment =
          workspace.requirePayment && workspace.paymentType !== 'NONE';

        appointment = await tx.appointment.create({
          data: {
            workspaceId: data.workspaceId,
            clientId: client!.id,
            startAt,
            endAt,
            status: requiresPayment ? 'PENDING_PAYMENT' : 'PENDING',
            bookedVia: 'public',
            totalPriceCents: totalServicesCents,
            services: {
              create: services.map((s) => ({
                serviceId: s.id,
                durationMinutes: s.durationMinutes,
                priceCents: s.priceCents,
              })),
            },
          },
          include: {
            client: true,
            services: { include: { service: true } },
          },
        });
      }

      // ── CRIAR ORDER (se houver produtos) ──
      if (hasProducts) {
        const productIds = data.products.map((p) => p.serviceId);
        const products = await tx.service.findMany({
          where: {
            id: { in: productIds },
            workspaceId: data.workspaceId,
            isActive: true,
            itemType: 'PRODUCT',
          },
        });

        if (products.length !== productIds.length) {
          throw new BadRequestException(
            'Um ou mais produtos não encontrados ou inativos.',
          );
        }

        const quantityMap = new Map(
          data.products.map((p) => [p.serviceId, p.quantity]),
        );

        // Verificar e decrementar estoque
        for (const product of products) {
          const qty = quantityMap.get(product.id) || 1;
          const updated = await tx.service.updateMany({
            where: {
              id: product.id,
              workspaceId: data.workspaceId,
              stock: { gte: qty },
            },
            data: { stock: { decrement: qty } },
          });

          if (updated.count === 0) {
            throw new BadRequestException(
              `Estoque insuficiente para "${product.name}".`,
            );
          }
        }

        const totalProductsCents = products.reduce((sum, p) => {
          const qty = quantityMap.get(p.id) || 1;
          return sum + p.priceCents * qty;
        }, 0);

        order = await tx.order.create({
          data: {
            workspaceId: data.workspaceId,
            clientId: client!.id,
            status: 'PENDING',
            totalProductsCents,
            totalServicesCents: appointment?.totalPriceCents || 0,
            totalCents:
              totalProductsCents + (appointment?.totalPriceCents || 0),
            bookedVia: 'public',
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

        // Vincular appointment ↔ order se ambos existem
        if (appointment) {
          await tx.appointment.update({
            where: { id: appointment.id },
            data: { linkedOrderId: order.id },
          });
        }
      }

      return { appointment, order };
    });

    // Criar pagamento PIX se necessário (para valor total combinado)
    const requiresPayment =
      workspace.requirePayment && workspace.paymentType !== 'NONE';

    if (requiresPayment && result.appointment) {
      // Caso 1: Tem appointment (com ou sem produtos) → Payment record vinculado ao appointment
      const totalCombined =
        (result.appointment.totalPriceCents || 0) +
        (result.order?.totalProductsCents || 0);

      const payment = await this.paymentsService.createPaymentForAppointment(
        result.appointment.id,
        data.workspaceId,
        totalCombined,
      );

      if (payment) {
        paymentInfo = {
          paymentId: payment.id,
          appointmentId: result.appointment.id,
          orderId: result.order?.id,
          amountCents: payment.amountCents,
          pixCode: payment.pixCode || '',
          pixRecipientName: payment.workspace?.pixHolderName || '',
          pixKeyMasked: this.maskPixKey(
            payment.workspace?.pixKey,
            payment.workspace?.pixKeyType,
          ),
          expiresAt: payment.expiresAt.toISOString(),
        };
      }
    } else if (requiresPayment && !result.appointment && result.order) {
      // Caso 2: Somente produtos → gerar PIX direto no Order (sem Payment record)
      paymentInfo = await this.generatePixForOrder(
        result.order,
        data.workspaceId,
        workspace,
      );
    }

    this.logger.log(
      `✅ [${data.workspaceId}] Checkout unificado: ` +
        `appointment=${result.appointment?.id || 'none'} | ` +
        `order=${result.order?.id || 'none'} | ` +
        `cliente=${client!.name}`,
    );

    return {
      appointment: result.appointment,
      order: result.order,
      paymentInfo,
      requiresPayment,
    };
  }

  /**
   * Busca pedidos de um cliente por telefone e slug (endpoint público)
   */
  async findClientOrders(slug: string, phone: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true, businessMode: true },
    });
    if (!workspace || workspace.businessMode === 'BOOKING') return [];

    const phoneE164 = normalizePhoneE164(phone);
    const client = await this.prisma.client.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: workspace.id,
          phoneE164,
        },
      },
      select: { id: true },
    });
    if (!client) return [];

    return this.prisma.order.findMany({
      where: { workspaceId: workspace.id, clientId: client.id },
      select: {
        id: true,
        status: true,
        totalCents: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            quantity: true,
            priceCents: true,
            service: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Busca agendamentos de um cliente por telefone e slug (endpoint público)
   */
  async findClientAppointments(slug: string, phone: string) {
    if (!slug || !phone) return [];

    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!workspace) return [];

    const phoneE164 = normalizePhoneE164(phone);
    const client = await this.prisma.client.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId: workspace.id,
          phoneE164,
        },
      },
      select: { id: true },
    });
    if (!client) return [];

    return this.prisma.appointment.findMany({
      where: {
        workspaceId: workspace.id,
        clientId: client.id,
        status: { in: ['PENDING', 'CONFIRMED', 'PENDING_PAYMENT', 'COMPLETED'] },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        totalPriceCents: true,
        workspace: {
          select: { id: true, name: true, brandName: true, slug: true },
        },
        client: {
          select: { name: true, phoneE164: true },
        },
        services: {
          select: {
            durationMinutes: true,
            priceCents: true,
            service: {
              select: { id: true, name: true, durationMinutes: true, priceCents: true },
            },
          },
        },
      },
      orderBy: { startAt: 'desc' },
      take: 10,
    });
  }
}
