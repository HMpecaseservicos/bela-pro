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
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessInvitesService, CreateInviteDto, UpdateInviteDto, InviteFilters } from './business-invites.service';
import { BusinessInviteStatus, InviteFocusType } from '@prisma/client';

// Guard para verificar se é Super Admin
function requireSuperAdmin(req: any) {
  if (!req.user?.isSuperAdmin) {
    throw new ForbiddenException('Acesso negado: requer Super Admin');
  }
}

@Controller('api/v1/business-invites')
export class BusinessInvitesController {
  constructor(private readonly invitesService: BusinessInvitesService) {}

  // ==================== ENDPOINTS PÚBLICOS (Landing Page) ====================

  /**
   * GET /business-invites/public/:token
   * Busca convite por token para exibir na landing page
   */
  @Get('public/:token')
  async getPublicInvite(@Param('token') token: string) {
    const invite = await this.invitesService.findByToken(token);
    
    if (!invite) {
      return {
        success: false,
        error: 'Convite não encontrado ou expirado',
      };
    }

    // Verifica se expirou
    if (new Date() > invite.expiresAt) {
      return {
        success: false,
        error: 'Este convite expirou',
        expired: true,
      };
    }

    // Retorna dados limitados (sem expor informações sensíveis)
    return {
      success: true,
      data: {
        businessName: invite.businessName,
        contactName: invite.contactName,
        focusType: invite.focusType,
        personalMessage: invite.personalMessage,
        expiresAt: invite.expiresAt,
      },
    };
  }

  /**
   * POST /business-invites/public/:token/cta-click
   * Registra clique no CTA da landing page
   */
  @Post('public/:token/cta-click')
  async registerCtaClick(@Param('token') token: string) {
    return this.invitesService.registerCtaClick(token);
  }

  // ==================== ENDPOINTS PROTEGIDOS (Super Admin) ====================

  /**
   * GET /business-invites/dashboard
   * Dashboard de métricas de convites
   */
  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  async getDashboard(@Req() req: any) {
    requireSuperAdmin(req);
    return this.invitesService.getDashboardMetrics();
  }

  /**
   * GET /business-invites
   * Lista todos os convites com filtros
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: any,
    @Query('status') status?: BusinessInviteStatus,
    @Query('focusType') focusType?: InviteFocusType,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    requireSuperAdmin(req);

    const filters: InviteFilters = {
      status,
      focusType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.invitesService.findAll(filters);
  }

  /**
   * GET /business-invites/:id
   * Busca convite por ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.invitesService.findById(id);
  }

  /**
   * POST /business-invites
   * Cria novo convite
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() body: CreateInviteDto) {
    requireSuperAdmin(req);
    const invite = await this.invitesService.createInvite(req.user.userId, body);
    
    // Gera link e mensagem de WhatsApp
    const inviteLink = this.invitesService.getInviteLink(invite.token);
    const whatsappMessage = this.invitesService.generateWhatsAppMessage(invite);

    return {
      ...invite,
      inviteLink,
      whatsappMessage,
    };
  }

  /**
   * PUT /business-invites/:id
   * Atualiza convite
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateInviteDto,
  ) {
    requireSuperAdmin(req);
    return this.invitesService.update(id, body);
  }

  /**
   * DELETE /business-invites/:id
   * Cancela convite
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.invitesService.cancel(id);
  }

  /**
   * POST /business-invites/:id/reactivate
   * Reativa convite expirado ou cancelado
   */
  @Post(':id/reactivate')
  @UseGuards(JwtAuthGuard)
  async reactivate(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { expiresInDays?: number },
  ) {
    requireSuperAdmin(req);
    return this.invitesService.reactivate(id, body.expiresInDays);
  }

  /**
   * POST /business-invites/:id/mark-whatsapp-sent
   * Marca convite como enviado via WhatsApp
   */
  @Post(':id/mark-whatsapp-sent')
  @UseGuards(JwtAuthGuard)
  async markWhatsAppSent(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.invitesService.markSentViaWhatsApp(id);
  }

  /**
   * POST /business-invites/:id/mark-email-sent
   * Marca convite como enviado via Email
   */
  @Post(':id/mark-email-sent')
  @UseGuards(JwtAuthGuard)
  async markEmailSent(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.invitesService.markSentViaEmail(id);
  }

  /**
   * GET /business-invites/:id/whatsapp-link
   * Gera link de WhatsApp com mensagem pronta
   */
  @Get(':id/whatsapp-link')
  @UseGuards(JwtAuthGuard)
  async getWhatsAppLink(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
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

  /**
   * POST /business-invites/expire-old
   * Expira convites antigos (para cron job)
   */
  @Post('expire-old')
  @UseGuards(JwtAuthGuard)
  async expireOld(@Req() req: any) {
    requireSuperAdmin(req);
    return this.invitesService.expireOldInvites();
  }
}
