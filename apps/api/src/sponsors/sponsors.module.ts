import { Module } from '@nestjs/common';
import { SponsorsAdminController, SponsorsPublicController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { WorkspaceSponsorsController, BookingSponsorsController } from './workspace-sponsors.controller';
import { WorkspaceSponsorsService } from './workspace-sponsors.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [
    SponsorsAdminController,
    SponsorsPublicController,
    WorkspaceSponsorsController,
    BookingSponsorsController,
  ],
  providers: [SponsorsService, WorkspaceSponsorsService],
  exports: [SponsorsService, WorkspaceSponsorsService],
})
export class SponsorsModule {}
