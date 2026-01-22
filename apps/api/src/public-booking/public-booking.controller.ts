import { Controller, Post, Body } from '@nestjs/common';
import { PublicBookingService } from './public-booking.service';

@Controller('public-booking')
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
}
