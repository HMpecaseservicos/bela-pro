import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TimeSlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna horários disponíveis para um serviço em uma data específica
   * RESPEITA todas as configurações do workspace:
   * - slotIntervalMinutes
   * - minLeadTimeMinutes
   * - bufferMinutes
   * - maxBookingDaysAhead
   */
  async getAvailableSlots(
    workspaceId: string,
    serviceId: string,
    date: string, // formato: YYYY-MM-DD
  ): Promise<TimeSlot[]> {
    // 1. Busca workspace para pegar configurações
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        minLeadTimeMinutes: true,
        bufferMinutes: true,
        maxBookingDaysAhead: true,
        slotIntervalMinutes: true,
        timezone: true,
      },
    });

    if (!workspace) {
      throw new BadRequestException('Workspace não encontrado.');
    }

    // 2. Valida que serviço existe e pertence ao workspace
    // TENANT ISOLATION: findFirst com workspaceId no WHERE para evitar enumeração de IDs
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, workspaceId, isActive: true },
    });

    if (!service) {
      throw new BadRequestException('Serviço não encontrado ou inativo.');
    }

    const targetDate = new Date(date);
    const now = new Date();

    // 3. Valida maxBookingDaysAhead
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + workspace.maxBookingDaysAhead);
    if (targetDate > maxDate) {
      return []; // Data muito distante no futuro
    }

    // 4. Calcula horário mínimo respeitando minLeadTimeMinutes
    const minStartTime = new Date(now.getTime() + workspace.minLeadTimeMinutes * 60000);

    const dayOfWeek = targetDate.getDay(); // 0=Dom, 6=Sab

    // 5. Busca regras de horário para este dia da semana
    const scheduleRules = await this.prisma.scheduleRule.findMany({
      where: {
        workspaceId,
        dayOfWeek,
        isActive: true,
      },
      orderBy: {
        startTimeMinutes: 'asc',
      },
    });

    if (scheduleRules.length === 0) {
      return []; // Sem expediente neste dia
    }

    // 6. Busca folgas (time-off) que afetam este dia
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const timeOffs = await this.prisma.timeOff.findMany({
      where: {
        workspaceId,
        OR: [
          {
            AND: [
              { startAt: { lt: endOfDay } },
              { endAt: { gt: startOfDay } },
            ],
          },
        ],
      },
    });

    // Se tem time-off cobrindo o dia todo, retorna vazio
    const hasFullDayOff = timeOffs.some(
      (off) => off.startAt <= startOfDay && off.endAt >= endOfDay,
    );
    if (hasFullDayOff) {
      return [];
    }

    // 7. Busca agendamentos existentes neste dia
    const appointments = await this.prisma.appointment.findMany({
      where: {
        workspaceId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        startAt: 'asc',
      },
    });

    // 8. Gera slots usando slotIntervalMinutes do workspace
    const slots: TimeSlot[] = [];
    const slotIntervalMinutes = workspace.slotIntervalMinutes || 15;
    const bufferMinutes = workspace.bufferMinutes || 0;

    // Calcula offset do timezone (America/Sao_Paulo = -3 horas = -180 minutos)
    // Para converter horário local do workspace para UTC, somamos o offset
    const timezoneOffsetMinutes = this.getTimezoneOffsetMinutes(workspace.timezone || 'America/Sao_Paulo', targetDate);

    for (const rule of scheduleRules) {
      let currentMinutes = rule.startTimeMinutes;

      while (currentMinutes + service.durationMinutes <= rule.endTimeMinutes) {
        // Cria o slot no horário UTC (adiciona offset do timezone)
        const slotStart = new Date(targetDate);
        slotStart.setUTCHours(0, 0, 0, 0);
        slotStart.setUTCMinutes(currentMinutes + timezoneOffsetMinutes);

        const slotEnd = new Date(slotStart);
        slotEnd.setUTCMinutes(slotStart.getUTCMinutes() + service.durationMinutes);

        // Verifica minLeadTimeMinutes (antecedência mínima)
        if (slotStart < minStartTime) {
          currentMinutes += slotIntervalMinutes;
          continue;
        }

        // Verifica se slot conflita com time-off
        const hasTimeOffConflict = timeOffs.some(
          (off) => slotStart < off.endAt && slotEnd > off.startAt,
        );

        // Verifica se slot conflita com agendamento existente (com buffer)
        const hasAppointmentConflict = appointments.some((appt) => {
          const apptEndWithBuffer = new Date(appt.endAt.getTime() + bufferMinutes * 60000);
          return slotStart < apptEndWithBuffer && slotEnd > appt.startAt;
        });

        slots.push({
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          available: !hasTimeOffConflict && !hasAppointmentConflict,
        });

        currentMinutes += slotIntervalMinutes;
      }
    }

    return slots;
  }

  /**
   * Calcula o offset do timezone em minutos
   * Retorna quantos minutos adicionar ao horário local para obter UTC
   */
  private getTimezoneOffsetMinutes(timezone: string, date: Date): number {
    // Cria uma data no timezone especificado
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });

    // Calcula a diferença entre UTC e o timezone local
    const utcDate = new Date(date);
    utcDate.setUTCHours(12, 0, 0, 0); // Meio dia UTC para evitar problemas de DST

    const parts = formatter.formatToParts(utcDate);
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

    // Hora no timezone local quando é 12:00 UTC
    const localMinutes = hour * 60 + minute;
    const utcMinutes = 12 * 60;

    // Offset = UTC - Local (para converter local -> UTC, somamos o offset)
    return utcMinutes - localMinutes;
  }

  /**
   * Retorna próximos dias disponíveis (com pelo menos 1 horário livre)
   */
  async getAvailableDays(
    workspaceId: string,
    serviceId: string,
    fromDate: string,
    limit = 30,
  ): Promise<string[]> {
    const availableDays: string[] = [];
    const currentDate = new Date(fromDate);
    let daysChecked = 0;

    while (availableDays.length < limit && daysChecked < 90) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const slots = await this.getAvailableSlots(workspaceId, serviceId, dateStr);

      if (slots.some((slot) => slot.available)) {
        availableDays.push(dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    return availableDays;
  }
}
