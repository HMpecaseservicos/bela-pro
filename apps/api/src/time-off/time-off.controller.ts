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
import { TimeOffService } from './time-off.service';

@Controller('api/v1/time-off')
@UseGuards(JwtAuthGuard)
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.timeOffService.create(workspaceId, body);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { workspaceId } = req.user;
    return this.timeOffService.findAll(workspaceId, from, to);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.timeOffService.findOne(workspaceId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.timeOffService.update(workspaceId, id, body);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.timeOffService.delete(workspaceId, id);
  }
}
