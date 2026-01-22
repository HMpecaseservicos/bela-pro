import { Controller, Get, Query, Param } from '@nestjs/common';
import { AvailabilityService } from './availability.service';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /availability/slots?workspaceId=xxx&serviceId=xxx&date=2026-01-20
   * Público - não requer autenticação
   */
  @Get('slots')
  async getSlots(
    @Query('workspaceId') workspaceId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.availabilityService.getAvailableSlots(workspaceId, serviceId, date);
  }

  /**
   * GET /availability/days?workspaceId=xxx&serviceId=xxx&from=2026-01-20&limit=30
   * Público - não requer autenticação
   */
  @Get('days')
  async getDays(
    @Query('workspaceId') workspaceId: string,
    @Query('serviceId') serviceId: string,
    @Query('from') from: string,
    @Query('limit') limit?: string,
  ) {
    return this.availabilityService.getAvailableDays(
      workspaceId,
      serviceId,
      from,
      limit ? parseInt(limit, 10) : 30,
    );
  }
}
