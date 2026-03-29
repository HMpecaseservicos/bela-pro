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
import { SkipThrottle } from '@nestjs/throttler';
import { AdminMessagesService } from './admin-messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { AdminMessageType } from '@prisma/client';

// =============================================================================
// SUPER ADMIN CONTROLLER — Gerenciamento de mensagens globais
// =============================================================================

@Controller('api/v1/admin/messages')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminMessagesAdminController {
  constructor(private readonly adminMessagesService: AdminMessagesService) {}

  /**
   * Cria uma nova mensagem para todos os workspaces
   */
  @Post()
  async create(
    @Req() req: { user: { userId: string } },
    @Body() body: unknown,
  ) {
    return this.adminMessagesService.create(body, req.user.userId);
  }

  /**
   * Atualiza uma mensagem existente
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    return this.adminMessagesService.update(id, body);
  }

  /**
   * Remove uma mensagem
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.adminMessagesService.delete(id);
  }

  /**
   * Lista todas as mensagens
   */
  @Get()
  async findAll(
    @Query('isActive') isActive?: string,
    @Query('type') type?: AdminMessageType,
    @Query('search') search?: string,
  ) {
    return this.adminMessagesService.findAll({
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      type,
      search,
    });
  }

  /**
   * Busca uma mensagem específica com estatísticas
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminMessagesService.findOne(id);
  }

  /**
   * Ativa uma mensagem
   */
  @Patch(':id/activate')
  async activate(@Param('id') id: string) {
    return this.adminMessagesService.activate(id);
  }

  /**
   * Desativa uma mensagem
   */
  @Patch(':id/deactivate')
  async deactivate(@Param('id') id: string) {
    return this.adminMessagesService.deactivate(id);
  }
}

// =============================================================================
// WORKSPACE CONTROLLER — Para usuários verem mensagens do admin
// =============================================================================

@Controller('api/v1/workspace/admin-messages')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class AdminMessagesWorkspaceController {
  constructor(private readonly adminMessagesService: AdminMessagesService) {}

  /**
   * Retorna mensagens ativas para o workspace atual
   */
  @Get()
  async getActiveMessages(
    @Req() req: { user: { workspaceId: string } },
    @Query('plan') plan?: string,
  ) {
    const messages = await this.adminMessagesService.getActiveMessagesForWorkspace(
      req.user.workspaceId,
      plan,
    );

    // Track views
    for (const msg of messages) {
      this.adminMessagesService.trackView(msg.id).catch(() => {});
    }

    return messages;
  }

  /**
   * Dispensa uma mensagem (não mostrar mais)
   */
  @Post(':id/dismiss')
  async dismissMessage(
    @Param('id') id: string,
    @Req() req: { user: { workspaceId: string } },
  ) {
    return this.adminMessagesService.dismissMessage(id, req.user.workspaceId);
  }
}
