import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceSponsorsService } from './workspace-sponsors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// =============================================================================
// WORKSPACE SPONSORS CONTROLLER
// Permite que assinantes gerenciem seus próprios patrocinadores locais
// =============================================================================

@Controller('api/v1/workspace/sponsors')
@UseGuards(JwtAuthGuard)
export class WorkspaceSponsorsController {
  constructor(private readonly workspaceSponsorsService: WorkspaceSponsorsService) {}

  /**
   * Retorna configurações de patrocinadores do workspace
   */
  @Get('settings')
  async getSettings(@Req() req: { user: { workspaceId: string } }) {
    return this.workspaceSponsorsService.getWorkspaceSettings(req.user.workspaceId);
  }

  /**
   * Atualiza se o workspace exibe sponsors globais
   */
  @Patch('settings/show-global')
  async updateShowGlobal(
    @Req() req: { user: { workspaceId: string } },
    @Body() body: { showGlobal: boolean },
  ) {
    return this.workspaceSponsorsService.updateShowGlobalSponsors(
      req.user.workspaceId,
      body.showGlobal,
    );
  }

  /**
   * Cria um novo patrocinador local
   */
  @Post()
  async create(
    @Req() req: { user: { userId: string; workspaceId: string } },
    @Body() body: unknown,
  ) {
    return this.workspaceSponsorsService.create(
      req.user.workspaceId,
      body,
      req.user.userId,
    );
  }

  /**
   * Atualiza um patrocinador local
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; workspaceId: string } },
    @Body() body: unknown,
  ) {
    return this.workspaceSponsorsService.update(
      req.user.workspaceId,
      id,
      body,
      req.user.userId,
    );
  }

  /**
   * Remove um patrocinador local
   */
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Req() req: { user: { workspaceId: string } },
  ) {
    return this.workspaceSponsorsService.delete(req.user.workspaceId, id);
  }

  /**
   * Lista todos os patrocinadores locais do workspace
   */
  @Get()
  async findAll(
    @Req() req: { user: { workspaceId: string } },
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
  ) {
    return this.workspaceSponsorsService.findAllByWorkspace(req.user.workspaceId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
    });
  }

  /**
   * Busca um patrocinador específico
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: { user: { workspaceId: string } },
  ) {
    return this.workspaceSponsorsService.findOneByWorkspace(req.user.workspaceId, id);
  }

  /**
   * Reordena os patrocinadores
   */
  @Patch('reorder')
  async reorder(
    @Req() req: { user: { workspaceId: string } },
    @Body() body: { items: { id: string; displayOrder: number }[] },
  ) {
    return this.workspaceSponsorsService.reorder(req.user.workspaceId, body.items);
  }

  /**
   * Ativa um patrocinador
   */
  @Patch(':id/activate')
  async activate(
    @Param('id') id: string,
    @Req() req: { user: { workspaceId: string } },
  ) {
    return this.workspaceSponsorsService.activate(req.user.workspaceId, id);
  }

  /**
   * Desativa um patrocinador
   */
  @Patch(':id/deactivate')
  async deactivate(
    @Param('id') id: string,
    @Req() req: { user: { workspaceId: string } },
  ) {
    return this.workspaceSponsorsService.deactivate(req.user.workspaceId, id);
  }
}

// =============================================================================
// PUBLIC ENDPOINT - Para booking page identificar sponsors do workspace
// =============================================================================

@Controller('api/v1/public/booking')
export class BookingSponsorsController {
  constructor(private readonly workspaceSponsorsService: WorkspaceSponsorsService) {}

  /**
   * Retorna sponsors para exibição na página de booking
   * Combina sponsors locais do workspace + globais (se habilitado)
   */
  @Get(':workspaceSlug/sponsors')
  async getSponsorsForBooking(@Param('workspaceSlug') slug: string) {
    // Buscar workspaceId pelo slug
    // Note: Este endpoint precisa do PrismaService ou pode-se alterar
    // para aceitar workspaceId diretamente se o slug for igual ao id.
    // Por simplicidade, assumimos que o slug é unique e buscamos no service
    // Se precisar do slug to id lookup, mover para o service
    return { message: 'Use workspaceId endpoint' };
  }

  /**
   * Retorna sponsors para exibição na página de booking pelo workspaceId
   */
  @Get('workspace/:workspaceId/sponsors')
  async getSponsorsForBookingById(@Param('workspaceId') workspaceId: string) {
    return this.workspaceSponsorsService.getSponsorsForBookingPage(workspaceId);
  }
}
