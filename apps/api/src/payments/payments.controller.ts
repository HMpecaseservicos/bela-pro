import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import type { JwtSubject } from '../auth/auth.types';

/**
 * Controller de Pagamentos PIX
 * Gerencia configurações e confirmações de pagamento
 * 
 * Prefixo: /api/v1/payments
 */
@Controller('api/v1/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  // ==================== CONFIGURAÇÕES (ADMIN) ====================

  /**
   * GET /api/v1/payments/settings
   * Busca configurações de pagamento do workspace
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('settings')
  async getSettings(@Req() req: { user: JwtSubject }) {
    return this.payments.getPaymentSettings(req.user.workspaceId!);
  }

  /**
   * PUT /api/v1/payments/settings
   * Atualiza configurações de pagamento
   */
  @UseGuards(AuthGuard('jwt'))
  @Put('settings')
  async updateSettings(
    @Req() req: { user: JwtSubject },
    @Body() body: unknown
  ) {
    return this.payments.updatePaymentSettings(req.user.workspaceId!, body);
  }

  // ==================== LISTAGEM (ADMIN) ====================

  /**
   * GET /api/v1/payments/pending
   * Lista pagamentos pendentes (para agenda admin)
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('pending')
  async listPending(@Req() req: { user: JwtSubject }) {
    return this.payments.listPendingPayments(req.user.workspaceId!);
  }

  /**
   * GET /api/v1/payments/appointment/:appointmentId
   * Busca pagamento de um agendamento específico
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('appointment/:appointmentId')
  async getByAppointment(
    @Req() req: { user: JwtSubject },
    @Param('appointmentId') appointmentId: string
  ) {
    return this.payments.getPaymentByAppointment(appointmentId, req.user.workspaceId!);
  }

  // ==================== CONFIRMAÇÃO (ADMIN) ====================

  /**
   * POST /api/v1/payments/:id/confirm
   * Confirma pagamento manualmente
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/confirm')
  async confirmPayment(
    @Req() req: { user: JwtSubject },
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.payments.confirmPayment(
      id,
      req.user.workspaceId!,
      req.user.userId,
      body
    );
  }

  /**
   * POST /api/v1/payments/:id/cancel
   * Cancela pagamento e agendamento
   */
  @UseGuards(AuthGuard('jwt'))
  @Post(':id/cancel')
  async cancelPayment(
    @Req() req: { user: JwtSubject },
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    return this.payments.cancelPayment(id, req.user.workspaceId!, body.reason);
  }

  // ==================== EXPIRAÇÃO ====================

  /**
   * POST /api/v1/payments/process-expired
   * Processa pagamentos expirados (chamado manualmente ou via cron)
   */
  @UseGuards(AuthGuard('jwt'))
  @Post('process-expired')
  async processExpired(@Req() req: { user: JwtSubject }) {
    return this.payments.processExpiredPayments(req.user.workspaceId!);
  }
}

/**
 * Controller público para dados de pagamento (booking page)
 */
@Controller('api/v1/public')
export class PublicPaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /**
   * GET /api/v1/public/:slug/payment-info
   * Busca informações de pagamento para página de booking
   */
  @Get(':slug/payment-info')
  async getPaymentInfo(@Param('slug') slug: string) {
    return this.payments.getPublicPixData(slug);
  }
}
