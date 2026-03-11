import {
  Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards, Req,
} from '@nestjs/common';
import { SponsorInvitesService } from './sponsor-invites.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { Request } from 'express';

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
// ADMIN CONTRACT CONTROLLER
// =============================================================================

@Controller('api/v1/admin/sponsor-contracts')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SponsorContractsAdminController {
  constructor(private readonly service: SponsorInvitesService) {}

  @Get()
  listContracts(@Query('status') status?: string, @Query('sponsorId') sponsorId?: string) {
    return this.service.listContracts({ status, sponsorId });
  }

  @Get(':id')
  getContract(@Param('id') id: string) {
    return this.service.getContract(id);
  }

  @Post(':sponsorId/generate')
  generateContract(@Param('sponsorId') sponsorId: string, @Body('durationMonths') durationMonths?: number) {
    return this.service.generateContract(sponsorId, durationMonths || 6);
  }

  @Patch(':id/cancel')
  cancelContract(@Param('id') id: string, @Body('reason') reason: string) {
    return this.service.cancelContract(id, reason || 'Cancelado pelo administrador');
  }
}

// =============================================================================
// PUBLIC CONTROLLER
// =============================================================================

@Controller('api/v1/public/sponsor-invites')
export class SponsorInvitesPublicController {
  constructor(private readonly service: SponsorInvitesService) {}

  @Get('tier-details')
  getTierDetails() {
    return this.service.getTierDetails();
  }

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

  @Post(':token/self-register')
  selfRegister(@Param('token') token: string, @Body() body: unknown, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    return this.service.selfRegister(token, body, ip);
  }
}

// =============================================================================
// PUBLIC CONTRACT CONTROLLER
// =============================================================================

@Controller('api/v1/public/sponsor-contracts')
export class SponsorContractsPublicController {
  constructor(private readonly service: SponsorInvitesService) {}

  @Get(':contractNumber')
  getContractByNumber(@Param('contractNumber') contractNumber: string) {
    return this.service.getContractByNumber(contractNumber);
  }
}
