import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentNotificationService } from './appointment-notification.service';

@Module({
  imports: [PrismaModule, forwardRef(() => ChatbotModule)],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentNotificationService],
  exports: [AppointmentsService, AppointmentNotificationService],
})
export class AppointmentsModule {}
