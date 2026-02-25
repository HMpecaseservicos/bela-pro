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
import { FinancialService } from './financial.service';

@Controller('api/v1/financial')
@UseGuards(JwtAuthGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  // ==================== CATEGORIAS ====================

  @Get('categories')
  async getCategories(@Req() req: any, @Query('type') type?: 'INCOME' | 'EXPENSE') {
    return this.financialService.findAllCategories(req.user.workspaceId, type);
  }

  @Post('categories')
  async createCategory(@Req() req: any, @Body() body: any) {
    return this.financialService.createCategory(req.user.workspaceId, body);
  }

  @Delete('categories/:id')
  async deleteCategory(@Req() req: any, @Param('id') id: string) {
    return this.financialService.deleteCategory(req.user.workspaceId, id);
  }

  // ==================== TRANSAÇÕES ====================

  @Get('transactions')
  async getTransactions(
    @Req() req: any,
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('status') status?: 'PENDING' | 'COMPLETED' | 'CANCELLED',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.financialService.findAllTransactions(req.user.workspaceId, {
      type,
      status,
      startDate,
      endDate,
      categoryId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('transactions/:id')
  async getTransaction(@Req() req: any, @Param('id') id: string) {
    return this.financialService.findTransactionById(req.user.workspaceId, id);
  }

  @Post('transactions')
  async createTransaction(@Req() req: any, @Body() body: any) {
    return this.financialService.createTransaction(req.user.workspaceId, body);
  }

  @Put('transactions/:id')
  async updateTransaction(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.financialService.updateTransaction(req.user.workspaceId, id, body);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Req() req: any, @Param('id') id: string) {
    return this.financialService.deleteTransaction(req.user.workspaceId, id);
  }

  // ==================== DASHBOARD ====================

  @Get('dashboard')
  async getDashboard(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    // Se não fornecido, usa o mês atual
    const now = new Date();
    const defaultStart = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const defaultEnd = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    return this.financialService.getDashboard(req.user.workspaceId, {
      startDate: defaultStart,
      endDate: defaultEnd,
    });
  }

  // ==================== INTEGRAÇÃO AGENDAMENTOS ====================

  @Post('from-appointment/:appointmentId')
  async createFromAppointment(
    @Req() req: any,
    @Param('appointmentId') appointmentId: string,
    @Body() body: { paymentMethod?: 'PIX' | 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER' | 'OTHER' }
  ) {
    return this.financialService.createTransactionFromAppointment(
      req.user.workspaceId,
      appointmentId,
      body.paymentMethod
    );
  }
}
