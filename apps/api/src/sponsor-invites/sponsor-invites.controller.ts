import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { SponsorInvitesService } from './sponsor-invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';

// =============================================================================
// ADMIN CONTROLLER (SuperAdmin)
// =============================================================================

@Controller('api/v1/admin/sponsor-invites')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SponsorInvitesAdminController {
  constructor(private readonly service: SponsorInvitesService) {}

  @Post()
  create(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    return this.service.create(body, req.user.userId);
  }

  @Get()
  findAll(@Query('status') status?: string, @Query('search') search?: string) {
    return this.service.findAll({ status, search });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }

  @Patch(':id/resend')
  resend(@Param('id') id: string) {
    return this.service.resend(id);
  }
}

// =============================================================================
// PUBLIC CONTROLLER
// =============================================================================

@Controller('api/v1/public/sponsor-invites')
export class SponsorInvitesPublicController {
  constructor(private readonly service: SponsorInvitesService) {}

  @Get(':token')
  findByToken(@Param('token') token: string) {
    return this.service.findByToken(token);
  }

  @Post(':token/cta-click')
  registerCtaClick(@Param('token') token: string) {
    return this.service.registerCtaClick(token);
  }

  @Post(':token/accept')
  accept(@Param('token') token: string) {
    return this.service.acceptInvite(token);
  }

  @Post(':token/decline')
  decline(@Param('token') token: string) {
    return this.service.declineInvite(token);
  }
}
