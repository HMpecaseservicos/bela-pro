import { Module } from '@nestjs/common';
import { PaymentsController, PublicPaymentsController } from './payments.controller';
import { PixWebhookController } from './pix-webhook.controller';
import { PaymentsService } from './payments.service';

@Module({
  controllers: [PaymentsController, PublicPaymentsController, PixWebhookController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
