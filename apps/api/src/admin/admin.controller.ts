import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import type { JwtSubject } from '../auth/auth.types';

/**
 * Controller de administração global do sistema.
 * Todos os endpoints requerem autenticação de Super Admin.
 * 
 * Prefixo: /api/v1/admin
 */
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  /**
   * GET /api/v1/admin/dashboard
   * Retorna estatísticas gerais do sistema
   */
  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ==========================================================================
  // WORKSPACES
  // ==========================================================================

  /**
   * GET /api/v1/admin/workspaces
   * Lista todos os workspaces com paginação
   * Query params: page, limit, search
   */
  @Get('workspaces')
  async listWorkspaces(@Query() query: unknown) {
    return this.adminService.listWorkspaces(query);
  }

  /**
   * GET /api/v1/admin/workspaces/:id
   * Retorna detalhes completos de um workspace
   */
  @Get('workspaces/:id')
  async getWorkspace(@Param('id') id: string) {
    return this.adminService.getWorkspaceDetails(id);
  }

  /**
   * PATCH /api/v1/admin/workspaces/:id
   * Atualiza configurações administrativas de um workspace
   * Body: { name?, plan?, chatbotEnabled?, isActive? }
   */
  @Patch('workspaces/:id')
  async updateWorkspace(@Param('id') id: string, @Body() body: unknown) {
    return this.adminService.updateWorkspace(id, body);
  }

  /**
   * DELETE /api/v1/admin/workspaces/:id
   * Desativa um workspace (soft delete)
   */
  @Delete('workspaces/:id')
  async deleteWorkspace(@Param('id') id: string) {
    return this.adminService.deleteWorkspace(id);
  }

  // ==========================================================================
  // USERS
  // ==========================================================================

  /**
   * GET /api/v1/admin/users
   * Lista todos os usuários com paginação
   * Query params: page, limit, search
   */
  @Get('users')
  async listUsers(@Query() query: unknown) {
    return this.adminService.listUsers(query);
  }

  /**
   * GET /api/v1/admin/users/:id
   * Retorna detalhes de um usuário
   */
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    return this.adminService.getUserDetails(id);
  }

  /**
   * PATCH /api/v1/admin/users/:id
   * Atualiza dados de um usuário
   * Body: { name?, email?, isActive?, isSuperAdmin? }
   */
  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { user: JwtSubject },
  ) {
    return this.adminService.updateUser(id, body, req.user.userId);
  }

  /**
   * POST /api/v1/admin/users/super-admin
   * Cria um novo Super Admin
   * Body: { name, email, password }
   */
  @Post('users/super-admin')
  async createSuperAdmin(@Body() body: unknown) {
    return this.adminService.createSuperAdmin(body, hash);
  }

  // ==========================================================================
  // BILLING / USAGE
  // ==========================================================================

  /**
   * GET /api/v1/admin/billing/usage
   * Lista uso de chat por workspace (mês atual)
   * Query params: page, limit
   */
  @Get('billing/usage')
  async listChatUsage(@Query() query: unknown) {
    return this.adminService.listChatUsage(query);
  }

  /**
   * PATCH /api/v1/admin/billing/workspaces/:id/limit
   * Ajusta limite de conversas para um workspace
   * Body: { limit: number }
   */
  @Patch('billing/workspaces/:id/limit')
  async adjustChatLimit(@Param('id') id: string, @Body() body: { limit: number }) {
    return this.adminService.adjustChatLimit(id, body.limit);
  }

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================

  /**
   * GET /api/v1/admin/audit-logs
   * Lista logs de auditoria globais
   * Query params: page, limit
   */
  @Get('audit-logs')
  async listAuditLogs(@Query() query: unknown) {
    return this.adminService.listAuditLogs(query);
  }

  // ==========================================================================
  // IMPERSONAR WORKSPACE
  // ==========================================================================

  /**
   * POST /api/v1/admin/impersonate/:workspaceId
   * Gera token para super admin acessar qualquer workspace como owner
   */
  @Post('impersonate/:workspaceId')
  async impersonateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Req() req: { user: JwtSubject },
  ) {
    const data = await this.adminService.impersonateWorkspace(req.user.userId, workspaceId);
    
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    const ttl = Number(this.config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '3600'); // 1h para impersonation
    
    const accessToken = await this.jwt.signAsync(
      { 
        workspaceId: data.workspaceId, 
        role: data.role, 
        isSuperAdmin: true,
        isImpersonating: true, // Flag para identificar sessão de impersonation
      },
      { subject: data.userId, expiresIn: ttl, secret },
    );

    return {
      accessToken,
      workspace: data.workspace,
      expiresIn: ttl,
      warning: 'Este token é temporário e dá acesso total ao workspace.',
    };
  }

  // ==========================================================================
  // MÉTRICAS DE CRESCIMENTO
  // ==========================================================================

  /**
   * GET /api/v1/admin/metrics/growth
   * Retorna métricas de crescimento por período
   * Query params: period (week | month | quarter | year)
   */
  @Get('metrics/growth')
  async getGrowthMetrics(@Query() query: { period?: 'week' | 'month' | 'quarter' | 'year' }) {
    return this.adminService.getGrowthMetrics(query);
  }

  // ==========================================================================
  // CONFIGURAÇÕES DE PLANOS
  // ==========================================================================

  /**
   * GET /api/v1/admin/plans
   * Retorna configuração de limites por plano
   */
  @Get('plans')
  async getPlanLimits() {
    return this.adminService.getPlanLimits();
  }

  /**
   * POST /api/v1/admin/plans/bulk-update
   * Atualiza plano de múltiplos workspaces
   * Body: { workspaceIds: string[], plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE' }
   */
  @Post('plans/bulk-update')
  async bulkUpdatePlan(@Body() body: { workspaceIds: string[]; plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE' }) {
    return this.adminService.bulkUpdatePlan(body.workspaceIds, body.plan);
  }

  // ==========================================================================
  // EXPORTAÇÃO DE DADOS
  // ==========================================================================

  /**
   * GET /api/v1/admin/export/workspaces
   * Exporta lista de workspaces em formato CSV
   */
  @Get('export/workspaces')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=workspaces.csv')
  async exportWorkspacesCSV(@Res() res: Response) {
    const data = await this.adminService.exportWorkspacesCSV();
    res.send(data.csv);
  }

  /**
   * GET /api/v1/admin/export/workspaces/json
   * Exporta lista de workspaces em formato JSON
   */
  @Get('export/workspaces/json')
  async exportWorkspacesJSON() {
    return this.adminService.exportWorkspacesCSV();
  }

  /**
   * GET /api/v1/admin/export/users
   * Exporta lista de usuários em formato CSV
   */
  @Get('export/users')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename=users.csv')
  async exportUsersCSV(@Res() res: Response) {
    const data = await this.adminService.exportUsersCSV();
    res.send(data.csv);
  }

  /**
   * GET /api/v1/admin/export/users/json
   * Exporta lista de usuários em formato JSON
   */
  @Get('export/users/json')
  async exportUsersJSON() {
    return this.adminService.exportUsersCSV();
  }

  // ==========================================================================
  // NOTIFICAÇÕES BROADCAST
  // ==========================================================================

  /**
   * GET /api/v1/admin/broadcast/targets
   * Lista todos os owners de workspace para broadcast
   */
  @Get('broadcast/targets')
  async listBroadcastTargets() {
    return this.adminService.listBroadcastTargets();
  }

  /**
   * POST /api/v1/admin/broadcast
   * Cria uma notificação broadcast
   * Body: { title, message, targetPlans?, scheduledAt? }
   */
  @Post('broadcast')
  async createBroadcast(@Body() body: {
    title: string;
    message: string;
    targetPlans?: ('FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE')[];
    scheduledAt?: Date;
  }) {
    return this.adminService.createBroadcast(body);
  }

  // ==========================================================================
  // HEALTH CHECK DO SISTEMA
  // ==========================================================================

  /**
   * GET /api/v1/admin/health
   * Retorna status de saúde do sistema
   */
  @Get('health')
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }
}
