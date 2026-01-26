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
import { ScheduleRulesService } from './schedule-rules.service';

@Controller('api/v1/schedule-rules')
@UseGuards(JwtAuthGuard)
export class ScheduleRulesController {
  constructor(private readonly scheduleRulesService: ScheduleRulesService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.scheduleRulesService.create(workspaceId, body);
  }

  @Get()
  findAll(@Req() req: any, @Query('active') active?: string) {
    const { workspaceId } = req.user;
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.scheduleRulesService.findAll(workspaceId, isActive);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.scheduleRulesService.findOne(workspaceId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.scheduleRulesService.update(workspaceId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.scheduleRulesService.delete(workspaceId, id);
  }
}
