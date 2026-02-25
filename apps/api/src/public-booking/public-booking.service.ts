import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { normalizePhoneE164 } from '../utils/phone.util';
import { z } from 'zod';

const createPublicBookingSchema = z.object({
  workspaceId: z.string().min(1),
  clientName: z.string().min(2).max(80),
  clientPhone: z.string().min(10).max(20),
  serviceId: z.string().min(1),
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

    // Valida que serviço existe e pertence ao workspace
    // TENANT ISOLATION: findFirst com workspaceId no WHERE para evitar enumeração de IDs
    const service = await this.prisma.service.findFirst({
      where: { id: data.serviceId, workspaceId: data.workspaceId, isActive: true },
    });

    if (!service) {
      throw new BadRequestException('Serviço não encontrado ou inativo.');
    }

    // Calcula duração
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);

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

    // Cria agendamento
    const appointment = await this.prisma.appointment.create({
      data: {
        workspaceId: data.workspaceId,
        clientId: client.id,
        startAt,
        endAt,
        status: appointmentStatus,
        bookedVia: 'public',
        totalPriceCents: service.priceCents,
        services: {
          create: {
            serviceId: service.id,
            durationMinutes: service.durationMinutes,
            priceCents: service.priceCents,
          },
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
        service.priceCents
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
}
