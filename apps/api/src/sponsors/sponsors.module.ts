import { Module } from '@nestjs/common';
import { SponsorsAdminController, SponsorsPublicController } from './sponsors.controller';
import { SponsorsService } from './sponsors.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SponsorsAdminController, SponsorsPublicController],
  providers: [SponsorsService],
  exports: [SponsorsService],
})
export class SponsorsModule {}
