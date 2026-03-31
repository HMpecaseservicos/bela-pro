import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { TestimonialsService } from './testimonials.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/v1/testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  /**
   * GET /testimonials/public/:workspaceId
   * Público - lista depoimentos ativos para a homepage
   */
  @Get('public/:workspaceId')
  async getPublic(@Param('workspaceId') workspaceId: string) {
    return this.testimonialsService.findPublic(workspaceId);
  }

  /**
   * GET /testimonials
   * Autenticado - lista todos os depoimentos do workspace
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: any) {
    return this.testimonialsService.findAll(req.user.workspaceId);
  }

  /**
   * POST /testimonials
   * Autenticado - cria novo depoimento
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.testimonialsService.create(req.user.workspaceId, body);
  }

  /**
   * PATCH /testimonials/:id
   * Autenticado - atualiza depoimento
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.testimonialsService.update(req.user.workspaceId, id, body);
  }

  /**
   * DELETE /testimonials/:id
   * Autenticado - remove depoimento
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.testimonialsService.remove(req.user.workspaceId, id);
  }
}
