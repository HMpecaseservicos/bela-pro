import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.appointmentsService.create(workspaceId, body);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    const { workspaceId } = req.user;
    return this.appointmentsService.findAll(workspaceId, from, to, status);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.appointmentsService.findOne(workspaceId, id);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    const { workspaceId } = req.user;
    return this.appointmentsService.updateStatus(workspaceId, id, body.status);
  }

  @Put(':id/cancel')
  cancel(@Req() req: any, @Param('id') id: string, @Body() body: { cancelledBy: 'CLIENT' | 'PROFESSIONAL' }) {
    const { workspaceId } = req.user;
    return this.appointmentsService.cancel(workspaceId, id, body.cancelledBy);
  }
}
