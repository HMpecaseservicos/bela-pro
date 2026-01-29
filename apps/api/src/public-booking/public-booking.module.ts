import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PublicBookingController } from './public-booking.controller';
import { PublicBookingService } from './public-booking.service';

@Module({
  imports: [PrismaModule],
  controllers: [PublicBookingController],
  providers: [PublicBookingService],
})
export class PublicBookingModule {}
