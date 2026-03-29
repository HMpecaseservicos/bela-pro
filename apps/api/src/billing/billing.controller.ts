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
import { BillingService } from './billing.service';
import { SubscriptionPaymentService } from './subscription-payment.service';

// Guard para verificar se é Super Admin
function requireSuperAdmin(req: any) {
  if (!req.user?.isSuperAdmin) {
    throw new ForbiddenException('Acesso negado: requer Super Admin');
  }
}

@Controller('api/v1/billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly paymentService: SubscriptionPaymentService,
  ) {}

  // ==================== ENDPOINTS PARA USUÁRIOS COMUNS ====================

  /**
   * Lista planos disponíveis publicamente (para exibir na página de upgrade)
   */
  @Get('available-plans')
  async getAvailablePlans() {
    return this.billingService.getAvailablePlans();
  }

  /**
   * Retorna informações completas do plano do workspace atual
   * Inclui features habilitadas, status, limites, etc.
   */
  @Get('my-plan')
  async getMyPlanInfo(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.billingService.getWorkspacePlanInfo(workspaceId);
  }

  /**
   * Retorna assinatura do workspace do usuário (legacy)
   */
  @Get('my-subscription')
  async getMySubscription(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    return this.billingService.findSubscriptionByWorkspace(workspaceId);
  }

  /**
   * Verifica se uma feature específica está disponível
   */
  @Get('check-feature/:feature')
  async checkFeature(@Req() req: any, @Param('feature') feature: string) {
    const workspaceId = req.user.workspaceId;
    const hasFeature = await this.billingService.checkFeature(workspaceId, feature);
    return { feature, available: hasFeature };
  }

  /**
   * Inicia período de trial em um plano específico
   */
  @Post('start-trial/:planId')
  async startTrial(@Req() req: any, @Param('planId') planId: string) {
    const workspaceId = req.user.workspaceId;
    return this.billingService.startTrial(workspaceId, planId);
  }

  /**
   * Faz upgrade de plano (após pagamento confirmado)
   */
  @Post('upgrade')
  async upgradePlan(
    @Req() req: any,
    @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' }
  ) {
    const workspaceId = req.user.workspaceId;
    // TODO: Verificar se pagamento foi confirmado (integrar com PIX/gateway)
    return this.billingService.upgradePlan(workspaceId, body.planId, body.billingCycle);
  }

  /**
   * Sincroniza workspace com plano atual (útil após mudanças manuais)
   */
  @Post('sync')
  async syncWorkspace(@Req() req: any) {
    const workspaceId = req.user.workspaceId;
    await this.billingService.syncWorkspaceWithPlan(workspaceId);
    return { success: true };
  }

  // ==================== PAGAMENTOS PIX (Usuário) ====================

  /**
   * Cria intent de pagamento PIX para upgrade
   */
  @Post('payment/create-intent')
  async createPaymentIntent(
    @Req() req: any,
    @Body() body: { planId: string; billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' }
  ) {
    const workspaceId = req.user.workspaceId;
    return this.paymentService.createPaymentIntent(workspaceId, body.planId, body.billingCycle);
  }

  /**
   * Verifica status de um pagamento (polling)
   */
  @Get('payment/status/:intentId')
  async checkPaymentStatus(@Req() req: any, @Param('intentId') intentId: string) {
    return this.paymentService.checkPaymentStatus(intentId);
  }

  // ==================== PAGAMENTOS PIX (Super Admin) ====================

  /**
   * Lista pagamentos pendentes de confirmação
   */
  @Get('payment/pending')
  async listPendingPayments(@Req() req: any) {
    requireSuperAdmin(req);
    return this.paymentService.listPendingPayments();
  }

  /**
   * Confirma pagamento manualmente (após verificar PIX)
   */
  @Post('payment/confirm/:intentId')
  async confirmPayment(@Req() req: any, @Param('intentId') intentId: string) {
    requireSuperAdmin(req);
    return this.paymentService.confirmPayment(intentId, req.user.userId);
  }

  // ==================== PLANOS (Super Admin) ====================

  @Get('plans')
  async getAllPlans(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string
  ) {
    requireSuperAdmin(req);
    return this.billingService.findAllPlans(includeInactive === 'true');
  }

  @Get('plans/:id')
  async getPlan(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.billingService.findPlanById(id);
  }

  @Post('plans')
  async createPlan(@Req() req: any, @Body() body: any) {
    requireSuperAdmin(req);
    return this.billingService.createPlan(body);
  }

  @Put('plans/:id')
  async updatePlan(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    requireSuperAdmin(req);
    return this.billingService.updatePlan(id, body);
  }

  @Delete('plans/:id')
  async deletePlan(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.billingService.deletePlan(id);
  }

  @Post('plans/reorder')
  async reorderPlans(@Req() req: any, @Body() body: { planIds: string[] }) {
    requireSuperAdmin(req);
    return this.billingService.reorderPlans(body.planIds);
  }

  // ==================== ASSINATURAS ====================

  @Get('subscriptions')
  async getAllSubscriptions(
    @Req() req: any,
    @Query('status') status?: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELLED' | 'SUSPENDED',
    @Query('planId') planId?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    requireSuperAdmin(req);
    return this.billingService.findAllSubscriptions({
      status,
      planId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('subscriptions/:id')
  async getSubscription(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.billingService.findSubscriptionById(id);
  }

  @Get('subscriptions/workspace/:workspaceId')
  async getSubscriptionByWorkspace(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string
  ) {
    requireSuperAdmin(req);
    return this.billingService.findSubscriptionByWorkspace(workspaceId);
  }

  @Post('subscriptions')
  async createSubscription(@Req() req: any, @Body() body: any) {
    requireSuperAdmin(req);
    return this.billingService.createSubscription(body);
  }

  @Put('subscriptions/:id')
  async updateSubscription(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any
  ) {
    requireSuperAdmin(req);
    return this.billingService.updateSubscription(id, body);
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string }
  ) {
    requireSuperAdmin(req);
    return this.billingService.cancelSubscription(id, body.reason);
  }

  @Post('subscriptions/:id/activate')
  async activateSubscription(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.billingService.activateSubscription(id);
  }

  // ==================== FATURAS ====================

  @Get('invoices')
  async getAllInvoices(
    @Req() req: any,
    @Query('subscriptionId') subscriptionId?: string,
    @Query('status') status?: 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED',
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    requireSuperAdmin(req);
    return this.billingService.findAllInvoices({
      subscriptionId,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('invoices/:subscriptionId')
  async createInvoice(
    @Req() req: any,
    @Param('subscriptionId') subscriptionId: string
  ) {
    requireSuperAdmin(req);
    return this.billingService.createInvoice(subscriptionId);
  }

  @Post('invoices/:id/pay')
  async markInvoiceAsPaid(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      paymentMethod: string;
      transactionId?: string;
      notes?: string;
    }
  ) {
    requireSuperAdmin(req);
    return this.billingService.markInvoiceAsPaid(id, body);
  }

  @Post('invoices/:id/cancel')
  async cancelInvoice(@Req() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.billingService.cancelInvoice(id);
  }

  // ==================== CONFIGURAÇÕES ====================

  @Get('settings')
  async getSettings(@Req() req: any, @Query('prefix') prefix?: string) {
    requireSuperAdmin(req);
    return this.billingService.getSettings(prefix);
  }

  @Get('settings/:key')
  async getSetting(@Req() req: any, @Param('key') key: string) {
    requireSuperAdmin(req);
    const value = await this.billingService.getSetting(key);
    return { key, value };
  }

  @Put('settings/:key')
  async setSetting(
    @Req() req: any,
    @Param('key') key: string,
    @Body() body: { value: string }
  ) {
    requireSuperAdmin(req);
    return this.billingService.setSetting(key, body.value);
  }

  @Put('settings')
  async setSettings(@Req() req: any, @Body() body: Record<string, string>) {
    requireSuperAdmin(req);
    return this.billingService.setSettings(body);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    requireSuperAdmin(req);
    return this.billingService.getBillingDashboard();
  }

  @Get('payment-history')
  async getPaymentHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: 'subscription' | 'sponsor',
  ) {
    requireSuperAdmin(req);
    return this.billingService.getPaymentHistory(
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
      type,
    );
  }
}
