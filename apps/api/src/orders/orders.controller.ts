// LOJA UNIFICADA: Controller de Pedidos (Orders)
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
import { OrdersService } from './orders.service';

@Controller('api/v1/orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() req: any, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.ordersService.create(workspaceId, body);
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const { workspaceId } = req.user;
    return this.ordersService.findAll(
      workspaceId,
      status,
      from,
      to,
      limit ? parseInt(limit, 10) : undefined,
      offset ? parseInt(offset, 10) : undefined,
    );
  }

  @Get('summary')
  getDashboardSummary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { workspaceId } = req.user;
    return this.ordersService.getDashboardSummary(
      workspaceId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { workspaceId } = req.user;
    return this.ordersService.findOne(workspaceId, id);
  }

  @Put(':id/status')
  updateStatus(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const { workspaceId } = req.user;
    return this.ordersService.updateStatus(workspaceId, id, body);
  }
}
