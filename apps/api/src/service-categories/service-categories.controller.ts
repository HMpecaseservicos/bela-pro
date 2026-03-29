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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ServiceCategoriesService } from './service-categories.service';

@Controller('api/v1/service-categories')
@UseGuards(JwtAuthGuard)
export class ServiceCategoriesController {
  constructor(private readonly service: ServiceCategoriesService) {}

  @Post()
  create(@Req() req: any, @Body() body: unknown) {
    return this.service.create(req.user.workspaceId, body);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(
      req.user.workspaceId,
      includeInactive === 'true',
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.workspaceId, id);
  }

  @Put('reorder')
  reorder(@Req() req: any, @Body() body: unknown) {
    return this.service.reorder(req.user.workspaceId, body);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: unknown) {
    return this.service.update(req.user.workspaceId, id, body);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.remove(req.user.workspaceId, id);
  }
}
