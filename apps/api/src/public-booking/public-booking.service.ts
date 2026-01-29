import { Injectable, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

    // Normaliza telefone
    const phoneE164 = data.clientPhone.replace(/\D/g, '');

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

    // Cria agendamento como PENDING (público requer confirmação)
    const appointment = await this.prisma.appointment.create({
      data: {
        workspaceId: data.workspaceId,
        clientId: client.id,
        startAt,
        endAt,
        status: 'PENDING',
        bookedVia: 'public',
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

    this.logger.log(
      `✅ [${data.workspaceId}] Agendamento público criado: ${appointment.id} | ` +
      `cliente=${appointment.client.name} phone=${appointment.client.phoneE164}`
    );

    return appointment;
  }
}
