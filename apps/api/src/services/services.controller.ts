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
import { ServicesService } from './services.service';

@Controller('api/v1/services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.servicesService.create(workspaceId, body);
  }

  @Get()
  findAll(@Req() req: any, @Query('active') active?: string) {
    const { workspaceId } = req.user;
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.servicesService.findAll(workspaceId, isActive);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.servicesService.findOne(workspaceId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.servicesService.update(workspaceId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.servicesService.delete(workspaceId, id);
  }
}
