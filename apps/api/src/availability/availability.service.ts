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
   * Retorna horários disponíveis para um ou mais serviços em uma data específica.
   * Aceita serviceIds (array) para calcular duração total combinada.
   * Mantém compatibilidade com serviceId (string) para chamadas legadas.
   */
  async getAvailableSlots(
    workspaceId: string,
    serviceIdOrIds: string | string[],
    date: string, // formato: YYYY-MM-DD
  ): Promise<TimeSlot[]> {
    const serviceIds = Array.isArray(serviceIdOrIds) ? serviceIdOrIds : [serviceIdOrIds];

    if (serviceIds.length === 0) {
      throw new BadRequestException('Nenhum serviço informado.');
    }

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

    // 2. Valida que TODOS os serviços existem, pertencem ao workspace, estão ativos e são do tipo SERVICE
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        workspaceId,
        isActive: true,
      },
    });

    if (services.length !== serviceIds.length) {
      throw new BadRequestException('Um ou mais serviços não encontrados ou inativos.');
    }

    // Valida itemType — apenas SERVICE pode ser agendado
    const nonServiceItems = services.filter(s => (s as any).itemType && (s as any).itemType !== 'SERVICE');
    if (nonServiceItems.length > 0) {
      throw new BadRequestException('Produtos não podem ser agendados. Selecione apenas serviços.');
    }

    // 3. Calcula duração TOTAL combinada de todos os serviços
    const totalDurationMinutes = services.reduce((sum, s) => sum + s.durationMinutes, 0);

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

    // FIX: Calcula dayOfWeek baseado na data LOCAL (não UTC)
    // Quando recebemos "2026-03-21" queremos o dia da semana dessa data no timezone do workspace
    const [year, month, day] = date.split('-').map(Number);
    const localDate = new Date(year, month - 1, day); // Cria data em timezone local
    const dayOfWeek = localDate.getDay(); // 0=Dom, 6=Sab

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
    // PADRÃO BELEZA: Intervalo de 30 minutos, horários sempre redondos (:00 ou :30)
    const slots: TimeSlot[] = [];
    const slotIntervalMinutes = workspace.slotIntervalMinutes || 30; // Default 30 para área de beleza
    const bufferMinutes = workspace.bufferMinutes || 0;

    // Calcula offset do timezone (America/Sao_Paulo = -3 horas = -180 minutos)
    // Para converter horário local do workspace para UTC, somamos o offset
    const timezoneOffsetMinutes = this.getTimezoneOffsetMinutes(workspace.timezone || 'America/Sao_Paulo', targetDate);

    for (const rule of scheduleRules) {
      // PROFISSIONAL: Arredonda horário de início para próximo slot redondo
      // Ex: 07:15 → 07:30, 07:45 → 08:00, 07:00 → 07:00
      let currentMinutes = this.roundUpToSlotInterval(rule.startTimeMinutes, slotIntervalMinutes);

      while (currentMinutes + totalDurationMinutes <= rule.endTimeMinutes) {
        // Cria o slot no horário UTC (adiciona offset do timezone)
        const slotStart = new Date(targetDate);
        slotStart.setUTCHours(0, 0, 0, 0);
        slotStart.setUTCMinutes(currentMinutes + timezoneOffsetMinutes);

        const slotEnd = new Date(slotStart);
        slotEnd.setUTCMinutes(slotStart.getUTCMinutes() + totalDurationMinutes);

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
   * Arredonda minutos para o próximo múltiplo do intervalo
   * Ex: roundUpToSlotInterval(455, 30) = 480 (07:35 → 08:00)
   * Ex: roundUpToSlotInterval(450, 30) = 450 (07:30 → 07:30, já é múltiplo)
   */
  private roundUpToSlotInterval(minutes: number, interval: number): number {
    if (minutes % interval === 0) {
      return minutes; // Já é múltiplo
    }
    return Math.ceil(minutes / interval) * interval;
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
   * Aceita serviceIds (array) para calcular duração total combinada.
   */
  async getAvailableDays(
    workspaceId: string,
    serviceIdOrIds: string | string[],
    fromDate: string,
    limit = 30,
  ): Promise<string[]> {
    const availableDays: string[] = [];
    const currentDate = new Date(fromDate);
    let daysChecked = 0;

    while (availableDays.length < limit && daysChecked < 90) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const slots = await this.getAvailableSlots(workspaceId, serviceIdOrIds, dateStr);

      if (slots.some((slot) => slot.available)) {
        availableDays.push(dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
      daysChecked++;
    }

    return availableDays;
  }

  /**
   * Retorna o próximo horário disponível para o workspace (usa o serviço mais curto como referência).
   * Busca hoje + próximos 7 dias.
   */
  async getNextAvailableSlot(workspaceId: string): Promise<{ startAt: string; endAt: string; dayLabel: string } | null> {
    // Pega o serviço ativo mais curto do workspace como referência
    const shortestService = await this.prisma.service.findFirst({
      where: { workspaceId, isActive: true, itemType: 'SERVICE' },
      orderBy: { durationMinutes: 'asc' },
      select: { id: true },
    });

    if (!shortestService) return null;

    const now = new Date();

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(now);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];

      try {
        const slots = await this.getAvailableSlots(workspaceId, [shortestService.id], dateStr);
        const available = slots.find((s) => s.available);
        if (available) {
          let dayLabel = 'Hoje';
          if (i === 1) dayLabel = 'Amanhã';
          else if (i > 1) {
            dayLabel = checkDate.toLocaleDateString('pt-BR', { weekday: 'long' });
            dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
          }
          return { startAt: available.startAt, endAt: available.endAt, dayLabel };
        }
      } catch {
        continue;
      }
    }

    return null;
  }
}
