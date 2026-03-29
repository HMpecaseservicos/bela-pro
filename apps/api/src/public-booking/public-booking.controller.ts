import { Controller, Post, Put, Get, Body, Param, Query } from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';

@Controller('api/v1/public-booking')
export class PublicBookingController {
  constructor(private readonly publicBookingService: PublicBookingService) {}

  /**
   * POST /public-booking
   * Endpoint público para criar agendamento (não requer autenticação)
   */
  @Post()
  async createBooking(@Body() body: any) {
    return this.publicBookingService.createBooking(body);
  }

  /**
   * GET /public-booking/:id
   * Busca um agendamento público pelo ID e telefone (validação de propriedade)
   */
  @Get(':id')
  async getBooking(@Param('id') id: string, @Query('phone') phone: string) {
    return this.publicBookingService.findByIdAndPhone(id, phone);
  }

  /**
   * PUT /public-booking/:id/reschedule
   * Reagenda um agendamento público (valida propriedade pelo telefone)
   */
  @Put(':id/reschedule')
  async reschedule(@Param('id') id: string, @Body() body: any) {
    return this.publicBookingService.reschedulePublic(id, body);
  }

  /**
   * PUT /public-booking/:id/cancel
   * Cancela um agendamento público (valida propriedade pelo telefone)
   */
  @Put(':id/cancel')
  async cancel(@Param('id') id: string, @Body() body: any) {
    return this.publicBookingService.cancelPublic(id, body);
  }
}
