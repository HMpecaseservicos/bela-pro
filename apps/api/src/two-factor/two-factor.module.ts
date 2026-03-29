import { Module } from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorController, AdminTwoFactorController } from './two-factor.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TwoFactorService],
  controllers: [TwoFactorController, AdminTwoFactorController],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
