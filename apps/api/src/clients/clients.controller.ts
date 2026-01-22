import { Controller, Get, Patch, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientsService } from './clients.service';

@Controller('api/v1/clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.clientsService.findAll(req.user.workspaceId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.clientsService.findOne(req.user.workspaceId, id);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.clientsService.update(req.user.workspaceId, id, body);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.clientsService.delete(req.user.workspaceId, id);
  }
}
