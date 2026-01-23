import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatUsageService } from './chat-usage.service';
import { getCurrentYearMonth } from './chat-usage.types';

/**
 * Controller para consulta de uso de conversas.
 * Endpoints protegidos por JWT - apenas para o dashboard admin.
 * 
 * Não há endpoints de escrita aqui pois o registro de uso
 * é feito automaticamente pelo webhook do chatbot.
 */
@Controller('chat-usage')
@UseGuards(JwtAuthGuard)
export class ChatUsageController {
  constructor(private readonly chatUsageService: ChatUsageService) {}

  /**
   * GET /chat-usage/:workspaceId/current
   * 
   * Retorna o uso do mês atual para um workspace.
   * Útil para exibir no dashboard do admin.
   */
  @Get(':workspaceId/current')
  async getCurrentUsage(@Param('workspaceId') workspaceId: string) {
    const usage = await this.chatUsageService.getOrCreateMonthlyUsage(workspaceId);
    
    return {
      success: true,
      data: {
        ...usage,
        // Informações adicionais para UI
        totalConversations: usage.conversationsUsed + usage.excessConversations,
        remainingConversations: Math.max(0, usage.conversationsLimit - usage.conversationsUsed),
        isOverLimit: usage.excessConversations > 0,
      },
    };
  }

  /**
   * GET /chat-usage/:workspaceId/history?months=6
   * 
   * Retorna o histórico de uso dos últimos N meses.
   * Útil para gráficos e análise de tendência.
   */
  @Get(':workspaceId/history')
  async getUsageHistory(
    @Param('workspaceId') workspaceId: string,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    const history = await this.chatUsageService.getUsageHistory(workspaceId, monthsNum);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * GET /chat-usage/:workspaceId/summary?yearMonth=2026-01
   * 
   * Retorna um resumo detalhado de billing para um mês específico.
   * Inclui eventos recentes e contadores.
   */
  @Get(':workspaceId/summary')
  async getMonthlySummary(
    @Param('workspaceId') workspaceId: string,
    @Query('yearMonth') yearMonth?: string,
  ) {
    const targetMonth = yearMonth ?? getCurrentYearMonth();
    const summary = await this.chatUsageService.getMonthlyBillingSummary(
      workspaceId,
      targetMonth,
    );

    return {
      success: true,
      data: summary,
    };
  }

  /**
   * GET /chat-usage/:workspaceId/conversation/:conversationId/events
   * 
   * Retorna eventos de billing para uma conversa específica.
   * Útil para auditoria e debugging.
   */
  @Get(':workspaceId/conversation/:conversationId/events')
  async getConversationEvents(
    @Param('workspaceId') workspaceId: string,
    @Param('conversationId') conversationId: string,
  ) {
    const events = await this.chatUsageService.getConversationBillingEvents(
      conversationId,
    );

    return {
      success: true,
      data: events,
    };
  }
}
