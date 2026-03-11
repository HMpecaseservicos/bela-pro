import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SponsorDashboardService } from './sponsor-dashboard.service';
import { SponsorAuthGuard } from './sponsor-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';

// =============================================================================
// PUBLIC — Sponsor Login (no auth)
// =============================================================================

@Controller('api/v1/sponsor-auth')
export class SponsorAuthController {
  constructor(private readonly service: SponsorDashboardService) {}

  @Post('login')
  async login(@Body() body: unknown) {
    return this.service.login(body);
  }
}

// =============================================================================
// SPONSOR DASHBOARD — Protected by Sponsor JWT
// =============================================================================

@Controller('api/v1/sponsor-dashboard')
@UseGuards(AuthGuard('sponsor-jwt'), SponsorAuthGuard)
export class SponsorDashboardController {
  constructor(private readonly service: SponsorDashboardService) {}

  @Get('profile')
  async getProfile(@Req() req: { user: { sponsorId: string } }) {
    return this.service.getProfile(req.user.sponsorId);
  }

  @Put('profile')
  async updateProfile(
    @Req() req: { user: { sponsorId: string } },
    @Body() body: unknown,
  ) {
    return this.service.updateProfile(req.user.sponsorId, body);
  }

  @Get('stats')
  async getStats(@Req() req: { user: { sponsorId: string } }) {
    return this.service.getStats(req.user.sponsorId);
  }

  @Get('posts')
  async getPosts(@Req() req: { user: { sponsorId: string } }) {
    return this.service.getPosts(req.user.sponsorId);
  }

  @Post('posts')
  async createPost(
    @Req() req: { user: { sponsorId: string } },
    @Body() body: unknown,
  ) {
    return this.service.createPost(req.user.sponsorId, body);
  }

  @Put('posts/:postId')
  async updatePost(
    @Req() req: { user: { sponsorId: string } },
    @Param('postId') postId: string,
    @Body() body: unknown,
  ) {
    return this.service.updatePost(req.user.sponsorId, postId, body);
  }

  @Delete('posts/:postId')
  async deletePost(
    @Req() req: { user: { sponsorId: string } },
    @Param('postId') postId: string,
  ) {
    return this.service.deletePost(req.user.sponsorId, postId);
  }
}

// =============================================================================
// ADMIN — Setup sponsor access (SuperAdmin only)
// =============================================================================

@Controller('api/v1/admin/sponsor-access')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SponsorAccessAdminController {
  constructor(private readonly service: SponsorDashboardService) {}

  @Post(':sponsorId/setup')
  async setupAccess(
    @Param('sponsorId') sponsorId: string,
    @Body() body: { email: string; password: string },
  ) {
    return this.service.adminSetupSponsorAccess(sponsorId, body.email, body.password);
  }
}
