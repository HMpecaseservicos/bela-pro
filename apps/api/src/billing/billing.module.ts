import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionPaymentService } from './subscription-payment.service';
import { PlanFeatureGuard, PremiumGuard } from './plan-feature.guard';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, SubscriptionPaymentService, PlanFeatureGuard, PremiumGuard],
  exports: [BillingService, SubscriptionPaymentService, PlanFeatureGuard, PremiumGuard],
})
export class BillingModule {}
