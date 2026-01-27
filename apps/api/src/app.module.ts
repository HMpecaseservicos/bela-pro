import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { RootController } from './root.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ScheduleRulesModule } from './schedule-rules/schedule-rules.module';
import { TimeOffModule } from './time-off/time-off.module';
import { AvailabilityModule } from './availability/availability.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { PublicBookingModule } from './public-booking/public-booking.module';
import { UploadModule } from './upload/upload.module';
import { ClientsModule } from './clients/clients.module';
import { TeamModule } from './team/team.module';
import { MessageTemplatesModule } from './message-templates/message-templates.module';
import { ChatUsageModule } from './chat-usage/chat-usage.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { ChatbotTestModule } from './chatbot-test/chatbot-test.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ServicesModule,
    AppointmentsModule,
    ScheduleRulesModule,
    TimeOffModule,
    AvailabilityModule,
    WorkspaceModule,
    PublicBookingModule,
    UploadModule,
    ClientsModule,
    TeamModule,
    MessageTemplatesModule,
    ChatUsageModule,
    ChatbotModule,
    ChatbotTestModule,
  ],
  controllers: [HealthController, RootController],
})
export class AppModule {}
