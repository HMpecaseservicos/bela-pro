import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleRulesController } from './schedule-rules.controller';
import { ScheduleRulesService } from './schedule-rules.service';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleRulesController],
  providers: [ScheduleRulesService],
  exports: [ScheduleRulesService],
})
export class ScheduleRulesModule {}
