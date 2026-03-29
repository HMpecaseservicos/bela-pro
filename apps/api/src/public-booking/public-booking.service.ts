import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { normalizePhoneE164 } from '../utils/phone.util';
import { z } from 'zod';

const createPublicBookingSchema = z.object({
  workspaceId: z.string().min(1),
  clientName: z.string().min(2).max(80),
  clientPhone: z.string().min(10).max(20),
  serviceIds: z.array(z.string().cuid()).min(1).max(10),
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
}
