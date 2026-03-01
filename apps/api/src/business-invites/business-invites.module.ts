import { Module } from '@nestjs/common';
import { BusinessInvitesController } from './business-invites.controller';
import { BusinessInvitesService } from './business-invites.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BusinessInvitesController],
  providers: [BusinessInvitesService],
  exports: [BusinessInvitesService],
})
export class BusinessInvitesModule {}
