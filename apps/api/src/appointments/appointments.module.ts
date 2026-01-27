import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationQueueModule } from '../notification-queue/notification-queue.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentNotificationService } from './appointment-notification.service';

@Module({
  imports: [PrismaModule, NotificationQueueModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentNotificationService],
  exports: [AppointmentsService, AppointmentNotificationService],
})
export class AppointmentsModule {}
