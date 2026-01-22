import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createTimeOffSchema = z.object({
  startAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' }),
  endAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Data inválida' }),
  reason: z.string().max(200).optional(),
});

const updateTimeOffSchema = createTimeOffSchema.partial();

@Injectable()
export class TimeOffService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, input: unknown) {
    const data = createTimeOffSchema.parse(input);
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    if (startAt >= endAt) {
      throw new BadRequestException('Data/hora de início deve ser antes do fim.');
    }

    return this.prisma.timeOff.create({
      data: {
        workspaceId,
        startAt,
        endAt,
        reason: data.reason,
      },
    });
  }

  async findAll(workspaceId: string, from?: string, to?: string) {
    const where: any = { workspaceId };

    if (from && to) {
      where.startAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    return this.prisma.timeOff.findMany({
      where,
      orderBy: {
        startAt: 'asc',
      },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // TENANT ISOLATION: findFirst com workspaceId no where
    const timeOff = await this.prisma.timeOff.findFirst({
      where: { id, workspaceId },
    });

    if (!timeOff) {
      throw new NotFoundException('Folga não encontrada.');
    }

    return timeOff;
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateTimeOffSchema.parse(input);

    await this.findOne(workspaceId, id);

    if (data.startAt && data.endAt) {
      const startAt = new Date(data.startAt);
      const endAt = new Date(data.endAt);

      if (startAt >= endAt) {
        throw new BadRequestException('Data/hora de início deve ser antes do fim.');
      }
    }

    // TENANT ISOLATION: update com workspaceId no where
    const result = await this.prisma.timeOff.updateMany({
      where: { id, workspaceId },
      data: {
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
        ...(data.reason !== undefined && { reason: data.reason }),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Folga não encontrada.');
    }

    return this.findOne(workspaceId, id);
  }

  async delete(workspaceId: string, id: string) {
    // TENANT ISOLATION: delete com workspaceId no where
    const result = await this.prisma.timeOff.deleteMany({
      where: { id, workspaceId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Folga não encontrada.');
    }

    return { success: true };
  }
}
