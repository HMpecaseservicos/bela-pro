import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createAppointmentSchema = z.object({
  clientName: z.string().min(2).max(80),
  clientPhone: z.string().min(10).max(20),
  serviceIds: z.array(z.string().cuid()).min(1),
  startAt: z.string().datetime(),
  cancelReason: z.string().max(1000).optional(),
});

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(workspaceId: string, input: unknown) {
    const data = createAppointmentSchema.parse(input);
    const startAt = new Date(data.startAt);

    // Valida que serviços existem e pertencem ao workspace
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: data.serviceIds },
        workspaceId,
        isActive: true,
      },
    });

    if (services.length !== data.serviceIds.length) {
      throw new BadRequestException('Um ou mais serviços não encontrados ou inativos.');
    }

    // Calcula duração total
    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const endAt = new Date(startAt.getTime() + totalDurationMinutes * 60000);

    // Verifica conflitos com outros agendamentos confirmados/pendentes
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        workspaceId,
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
      throw new ConflictException('Já existe um agendamento neste horário.');
    }

    // Normaliza telefone para buscar/criar cliente
    const phoneE164 = data.clientPhone.replace(/\D/g, '');

    // Busca ou cria cliente
    let client = await this.prisma.client.findUnique({
      where: {
        workspaceId_phoneE164: {
          workspaceId,
          phoneE164,
        },
      },
    });

    if (!client) {
      client = await this.prisma.client.create({
        data: {
          workspaceId,
          name: data.clientName,
          phoneE164,
          status: 'NORMAL',
        },
      });
    } else {
      // Atualiza nome se mudou
      if (client.name !== data.clientName) {
        client = await this.prisma.client.update({
          where: { id: client.id },
          data: {
            name: data.clientName,
          },
        });
      }
    }

    // Cria agendamento
    const appointment = await this.prisma.appointment.create({
      data: {
        workspaceId,
        clientId: client.id,
        startAt,
        endAt,
        status: 'CONFIRMED',
        cancelReason: data.cancelReason,
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
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    this.logger.log(
      `✅ [${appointment.workspaceId}] Agendamento criado: ${appointment.id} | ` +
      `cliente=${appointment.client.name} phone=${appointment.client.phoneE164}`
    );

    return appointment;
  }

  /**
   * Retorna agendamentos criados recentemente (últimos X minutos)
   * Usado para notificações push no PWA
   */
  async findRecent(workspaceId: string, minutes: number = 5) {
    const since = new Date(Date.now() - minutes * 60 * 1000);

    return this.prisma.appointment.findMany({
      where: {
        workspaceId,
        createdAt: { gte: since },
      },
      include: {
        client: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Máximo 10 agendamentos recentes
    });
  }

  async findAll(
    workspaceId: string,
    from?: string,
    to?: string,
    status?: string,
  ) {
    const where: any = { workspaceId };

    if (from && to) {
      where.startAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        client: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // TENANT ISOLATION: findFirst com workspaceId no where
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, workspaceId },
      include: {
        client: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    return appointment;
  }

  async cancel(workspaceId: string, id: string, cancelledBy: 'CLIENT' | 'PROFESSIONAL') {
    const appointment = await this.findOne(workspaceId, id);

    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      throw new BadRequestException('Agendamento não pode ser cancelado.');
    }

    // TENANT ISOLATION: updateMany com workspaceId no where
    const result = await this.prisma.appointment.updateMany({
      where: { id, workspaceId },
      data: {
        status: 'CANCELLED',
        cancelledBy,
        cancelledAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    this.logger.log(`✅ [${workspaceId}] Agendamento ${id} cancelado`);

    return this.findOne(workspaceId, id);
  }

  async updateStatus(workspaceId: string, id: string, status: string) {
    await this.findOne(workspaceId, id);

    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;

    type AppointmentStatus = typeof validStatuses[number];
    const isAppointmentStatus = (value: string): value is AppointmentStatus =>
      validStatuses.some(s => s === value);

    if (!isAppointmentStatus(status)) {
      throw new BadRequestException('Status inválido.');
    }

    const typedStatus = status;

    // TENANT ISOLATION: updateMany com workspaceId no where
    const updateData: Record<string, unknown> = { status: typedStatus };
    
    if (typedStatus === 'CANCELLED') {
      updateData.cancelledBy = 'PROFESSIONAL';
      updateData.cancelledAt = new Date();
    }

    const result = await this.prisma.appointment.updateMany({
      where: { id, workspaceId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new NotFoundException('Agendamento não encontrado.');
    }

    this.logger.log(`✅ [${workspaceId}] Status do agendamento ${id} alterado para ${status}`);

    return this.findOne(workspaceId, id);
  }
}
