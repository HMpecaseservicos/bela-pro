import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { AdminModule } from './admin/admin.module';
import { PaymentsModule } from './payments/payments.module';
import { FinancialModule } from './financial/financial.module';
import { BillingModule } from './billing/billing.module';
import { BusinessInvitesModule } from './business-invites/business-invites.module';
import { SponsorsModule } from './sponsors/sponsors.module';
import { ServiceCategoriesModule } from './service-categories/service-categories.module';
import { SponsorInvitesModule } from './sponsor-invites/sponsor-invites.module';
import { SponsorDashboardModule } from './sponsor-dashboard/sponsor-dashboard.module';
import { TwoFactorModule } from './two-factor/two-factor.module';
import { OrdersModule } from './orders/orders.module'; // LOJA UNIFICADA
import { TestimonialsModule } from './testimonials/testimonials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // Rate limiting: 100 requests per minute by default
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 10, // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50, // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    PrismaModule,
    AuthModule,
    ServicesModule,
    AppointmentsModule,
    ScheduleRulesModule,
    TimeOffModule,
    AvailabilityModule,
    // AdminModule e SponsorsModule ANTES de WorkspaceModule:
    // WorkspaceController tem @Get(':workspaceId') que captura qualquer sub-rota
    // se registrado primeiro. Módulos com rotas /workspace/xxx mais específicas
    // precisam vir antes para ter prioridade na resolução de rotas.
    AdminModule,
    SponsorsModule,
    WorkspaceModule,
    PublicBookingModule,
    UploadModule,
    ClientsModule,
    TeamModule,
    MessageTemplatesModule,
    ChatUsageModule,
    PaymentsModule,
    FinancialModule,
    BillingModule,
    BusinessInvitesModule,
    ServiceCategoriesModule,
    SponsorInvitesModule,
    SponsorDashboardModule,
    TwoFactorModule,
    OrdersModule, // LOJA UNIFICADA
    TestimonialsModule,
  ],
  controllers: [HealthController, RootController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
