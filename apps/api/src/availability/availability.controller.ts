import { Controller, Get, Query, Param } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('api/v1/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /availability/slots?workspaceId=xxx&serviceIds=id1,id2&date=2026-01-20
   * Backward compat: aceita serviceId (singular) para chamadas legadas
   * Público - não requer autenticação
   */
  @Get('slots')
  async getSlots(
    @Query('workspaceId') workspaceId: string,
    @Query('serviceIds') serviceIds?: string,
    @Query('serviceId') serviceId?: string,
    @Query('date') date?: string,
  ) {
    const ids = this.parseServiceIds(serviceIds, serviceId);
    return this.availabilityService.getAvailableSlots(workspaceId, ids, date!);
  }

  /**
   * GET /availability/days?workspaceId=xxx&serviceIds=id1,id2&from=2026-01-20&limit=30
   * Backward compat: aceita serviceId (singular) para chamadas legadas
   * Público - não requer autenticação
   */
  @Get('days')
  async getDays(
    @Query('workspaceId') workspaceId: string,
    @Query('serviceIds') serviceIds?: string,
    @Query('serviceId') serviceId?: string,
    @Query('from') from?: string,
    @Query('limit') limit?: string,
  ) {
    const ids = this.parseServiceIds(serviceIds, serviceId);
    return this.availabilityService.getAvailableDays(
      workspaceId,
      ids,
      from!,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  /**
   * GET /availability/next-slot?workspaceId=xxx
   * Público - retorna o próximo horário disponível (qualquer serviço)
   */
  @Get('next-slot')
  async getNextSlot(@Query('workspaceId') workspaceId: string) {
    return this.availabilityService.getNextAvailableSlot(workspaceId);
  }

  /**
   * Parse serviceIds (comma-separated) ou serviceId (singular) para array
   */
  private parseServiceIds(serviceIds?: string, serviceId?: string): string[] {
    if (serviceIds) {
      return serviceIds.split(',').map(id => id.trim()).filter(Boolean);
    }
    if (serviceId) {
      return [serviceId];
    }
    return [];
  }
}
