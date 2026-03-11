import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { SponsorDashboardService } from './sponsor-dashboard.service';
import {
  SponsorAuthController,
  SponsorDashboardController,
  SponsorAccessAdminController,
} from './sponsor-dashboard.controller';
import { SponsorJwtStrategy } from './sponsor-jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [
    SponsorAuthController,
    SponsorDashboardController,
    SponsorAccessAdminController,
  ],
  providers: [
    SponsorDashboardService,
    SponsorJwtStrategy,
  ],
  exports: [SponsorDashboardService],
})
export class SponsorDashboardModule {}
