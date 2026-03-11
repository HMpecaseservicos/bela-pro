import { Module } from '@nestjs/common';
import { SponsorInvitesService } from './sponsor-invites.service';
import {
  SponsorInvitesAdminController,
  SponsorInvitesPublicController,
  SponsorContractsAdminController,
  SponsorContractsPublicController,
  SponsorPaymentsAdminController,
  SponsorPaymentsPublicController,
} from './sponsor-invites.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    SponsorInvitesAdminController,
    SponsorInvitesPublicController,
    SponsorContractsAdminController,
    SponsorContractsPublicController,
    SponsorPaymentsAdminController,
    SponsorPaymentsPublicController,
  ],
  providers: [SponsorInvitesService],
  exports: [SponsorInvitesService],
})
export class SponsorInvitesModule {}
