import { Controller, Get, Patch, Param, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/workspace')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /**
   * GET /workspace/me
   * Autenticado - retorna dados do workspace do usuário logado
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyWorkspace(@Req() req: any) {
    const { workspaceId } = req.user;
    return this.workspaceService.findById(workspaceId);
  }

  /**
   * PATCH /workspace/me
   * Autenticado - atualiza configurações do workspace do usuário logado
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyWorkspace(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.workspaceService.update(workspaceId, body);
  }

  /**
   * GET /workspace/by-slug/:slug
   * Público - retorna dados completos do workspace para página de agendamento
   */
  @Get('by-slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.workspaceService.findBySlug(slug);
  }

  /**
   * GET /workspace/:workspaceId/services
   * Público - lista serviços disponíveis para agendamento (ativos + públicos)
   */
  @Get(':workspaceId/services')
  async getServices(@Param('workspaceId') workspaceId: string) {
    return this.workspaceService.getPublicServices(workspaceId);
  }

  /**
   * GET /workspace/:workspaceId
   * Autenticado - retorna dados completos para o painel admin
   * SECURITY: Valida que workspaceId do URL corresponde ao do token
   */
  @UseGuards(JwtAuthGuard)
  @Get(':workspaceId')
  async getById(@Req() req: any, @Param('workspaceId') workspaceId: string) {
    // TENANT ISOLATION: Impede acesso a outro workspace via URL
    if (req.user.workspaceId !== workspaceId) {
      throw new ForbiddenException('Acesso negado a este workspace');
    }
    return this.workspaceService.findById(workspaceId);
  }

  /**
   * PATCH /workspace/:workspaceId
   * Autenticado - atualiza configurações do workspace
   * SECURITY: Valida que workspaceId do URL corresponde ao do token
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':workspaceId')
  async update(
    @Req() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() body: any,
  ) {
    // TENANT ISOLATION: Impede modificação de outro workspace via URL
    if (req.user.workspaceId !== workspaceId) {
      throw new ForbiddenException('Acesso negado a este workspace');
    }
    return this.workspaceService.update(workspaceId, body);
  }
}
