import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { BusinessInvitesService, CreateInviteDto, CreatePublicInviteDto, UpdateInviteDto, InviteFilters } from './business-invites.service';
import { BusinessInviteStatus, InviteFocusType, InviteType } from '@prisma/client';

@Controller('api/v1/business-invites')
export class BusinessInvitesController {
  constructor(private readonly invitesService: BusinessInvitesService) {}

  // ==================== ENDPOINTS PÚBLICOS (Landing Page) ====================

  @Get('public/:token')
  async getPublicInvite(@Param('token') token: string) {
    const invite = await this.invitesService.findByToken(token);
    
    if (!invite) {
      return {
        success: false,
        error: 'Convite não encontrado ou expirado',
      };
    }

    if (new Date() > invite.expiresAt) {
      return {
        success: false,
        error: 'Este convite expirou',
        expired: true,
      };
    }

    return {
      success: true,
      data: {
        inviteType: invite.inviteType,
        businessName: invite.businessName,
        contactName: invite.contactName,
        campaignName: invite.campaignName,
        focusType: invite.focusType,
        personalMessage: invite.personalMessage,
        expiresAt: invite.expiresAt,
      },
    };
  }

  @Post('public/:token/cta-click')
  async registerCtaClick(@Param('token') token: string) {
    return this.invitesService.registerCtaClick(token);
  }

  // ==================== ENDPOINTS PROTEGIDOS (Super Admin) ====================

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getDashboard() {
    return this.invitesService.getDashboardMetrics();
  }

  @Get('export/csv')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  async exportCsv(
    @Res() res: Response,
    @Query('status') status?: BusinessInviteStatus,
    @Query('focusType') focusType?: InviteFocusType,
    @Query('inviteType') inviteType?: InviteType,
    @Query('search') search?: string,
  ) {
    const csv = await this.invitesService.exportToCsv({ status, focusType, inviteType, search });
    res.setHeader('Content-Disposition', `attachment; filename=convites-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  }

  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async findAll(
    @Query('status') status?: BusinessInviteStatus,
    @Query('focusType') focusType?: InviteFocusType,
    @Query('inviteType') inviteType?: InviteType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: InviteFilters = {
      status,
      focusType,
      inviteType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.invitesService.findAll(filters);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async findById(@Param('id') id: string) {
    return this.invitesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async create(@Req() req: any, @Body() body: CreateInviteDto) {
    const invite = await this.invitesService.createInvite(req.user.userId, body);
    
    const inviteLink = this.invitesService.getInviteLink(invite.token);
    const whatsappMessage = this.invitesService.generateWhatsAppMessage(invite);

    return {
      ...invite,
      inviteLink,
      whatsappMessage,
    };
  }

  @Post('public-campaign')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async createPublicCampaign(@Req() req: any, @Body() body: CreatePublicInviteDto) {
    const invite = await this.invitesService.createPublicInvite(req.user.userId, body);
    
    const inviteLink = this.invitesService.getInviteLink(invite.slug || invite.token);

    return {
      ...invite,
      inviteLink,
      shareLinks: {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(`Transforme seu salão! Acesse: ${inviteLink}`)}`,
        instagram: inviteLink,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteLink)}`,
      },
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async update(@Param('id') id: string, @Body() body: UpdateInviteDto) {
    return this.invitesService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async cancel(@Param('id') id: string) {
    return this.invitesService.cancel(id);
  }

  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async reactivate(@Param('id') id: string, @Body() body: { expiresInDays?: number }) {
    return this.invitesService.reactivate(id, body.expiresInDays);
  }

  @Post(':id/mark-whatsapp-sent')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async markWhatsAppSent(@Param('id') id: string) {
    return this.invitesService.markSentViaWhatsApp(id);
  }

  @Post(':id/mark-email-sent')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async markEmailSent(@Param('id') id: string) {
    return this.invitesService.markSentViaEmail(id);
  }

  @Get(':id/whatsapp-link')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getWhatsAppLink(@Param('id') id: string) {
    const invite = await this.invitesService.findById(id);
    const message = this.invitesService.generateWhatsAppMessage(invite);
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = `https://wa.me/55${invite.phone}?text=${encodedMessage}`;

    return {
      phone: invite.phone,
      message,
      whatsappLink,
      inviteLink: this.invitesService.getInviteLink(invite.token),
    };
  }

  @Post('expire-old')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async expireOld() {
    return this.invitesService.expireOldInvites();
  }
}
