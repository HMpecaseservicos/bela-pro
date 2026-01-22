import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createScheduleRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6), // 0=Dom, 6=Sab
  startTimeMinutes: z.number().int().min(0).max(1439), // 0 = 00:00, 1439 = 23:59
  endTimeMinutes: z.number().int().min(0).max(1439),
  isActive: z.boolean().optional(),
});

const updateScheduleRuleSchema = createScheduleRuleSchema.partial();

@Injectable()
export class ScheduleRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, input: unknown) {
    const data = createScheduleRuleSchema.parse(input);

    if (data.startTimeMinutes >= data.endTimeMinutes) {
      throw new BadRequestException('Horário de início deve ser antes do horário de término.');
    }

    return this.prisma.scheduleRule.create({
      data: {
        ...data,
        workspaceId,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll(workspaceId: string, isActive?: boolean) {
    return this.prisma.scheduleRule.findMany({
      where: {
        workspaceId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTimeMinutes: 'asc' },
      ],
    });
  }

  async findOne(workspaceId: string, id: string) {
    // TENANT ISOLATION: findFirst com workspaceId no where
    const rule = await this.prisma.scheduleRule.findFirst({
      where: { id, workspaceId },
    });

    if (!rule) {
      throw new NotFoundException('Regra de horário não encontrada.');
    }

    return rule;
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateScheduleRuleSchema.parse(input);

    await this.findOne(workspaceId, id);

    if (data.startTimeMinutes !== undefined && data.endTimeMinutes !== undefined) {
      if (data.startTimeMinutes >= data.endTimeMinutes) {
        throw new BadRequestException('Horário de início deve ser antes do horário de término.');
      }
    }

    // TENANT ISOLATION: update com workspaceId no where
    const result = await this.prisma.scheduleRule.updateMany({
      where: { id, workspaceId },
      data,
    });

    if (result.count === 0) {
      throw new NotFoundException('Regra de horário não encontrada.');
    }

    return this.findOne(workspaceId, id);
  }

  async delete(workspaceId: string, id: string) {
    // TENANT ISOLATION: delete com workspaceId no where
    const result = await this.prisma.scheduleRule.deleteMany({
      where: { id, workspaceId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Regra de horário não encontrada.');
    }

    return { success: true };
  }

  // Helper: converter minutos para "HH:MM"
  static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Helper: converter "HH:MM" para minutos
  static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
