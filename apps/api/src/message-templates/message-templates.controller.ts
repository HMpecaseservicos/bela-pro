/**
 * Message Templates Controller
 * 
 * Endpoints para gerenciar templates de mensagem.
 * Todos os endpoints são autenticados e isolados por workspace.
 * 
 * @module message-templates
 */

import { Controller, Get, Put, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessageEventType, MESSAGE_EVENTS, TEMPLATE_VARIABLES } from './message-events';
import { renderTemplate, generateWhatsAppLink } from './template-renderer';

@Controller('api/v1/message-templates')
@UseGuards(JwtAuthGuard)
export class MessageTemplatesController {
  constructor(private readonly service: MessageTemplatesService) {}

  /**
   * GET /message-templates
   * Lista todos os templates do workspace (com defaults para os não customizados)
   */
  @Get()
  async findAll(@Req() req: any) {
    return this.service.findAll(req.user.workspaceId);
  }

  /**
   * GET /message-templates/events
   * Lista eventos disponíveis e variáveis suportadas
   */
  @Get('events')
  getEvents() {
    return {
      events: MESSAGE_EVENTS.map(e => ({
        type: e.type,
        label: e.label,
        description: e.description,
      })),
      variables: TEMPLATE_VARIABLES,
    };
  }

  /**
   * GET /message-templates/:eventType
   * Busca template específico por tipo de evento
   */
  @Get(':eventType')
  async findOne(@Req() req: any, @Param('eventType') eventType: MessageEventType) {
    return this.service.findByEventType(req.user.workspaceId, eventType);
  }

  /**
   * PUT /message-templates/:eventType
   * Cria ou atualiza um template
   */
  @Put(':eventType')
  async upsert(
    @Req() req: any,
    @Param('eventType') eventType: MessageEventType,
    @Body() body: any,
  ) {
    return this.service.upsert(req.user.workspaceId, eventType, body);
  }

  /**
   * PATCH /message-templates/:eventType/toggle
   * Ativa/desativa um template
   */
  @Patch(':eventType/toggle')
  async toggle(
    @Req() req: any,
    @Param('eventType') eventType: MessageEventType,
    @Body() body: { enabled: boolean },
  ) {
    return this.service.toggleEnabled(req.user.workspaceId, eventType, body.enabled);
  }

  /**
   * PATCH /message-templates/:eventType/reset
   * Reseta template para mensagem padrão
   */
  @Patch(':eventType/reset')
  async reset(@Req() req: any, @Param('eventType') eventType: MessageEventType) {
    return this.service.resetToDefault(req.user.workspaceId, eventType);
  }

  /**
   * POST /message-templates/preview
   * Gera preview de uma mensagem com variáveis de exemplo
   */
  @Patch('preview')
  preview(@Body() body: { message: string }) {
    const exampleContext = {
      clientName: 'Maria Silva',
      serviceName: 'Corte + Escova',
      date: 'segunda-feira, 27/01/2026',
      time: '14:30',
      workspaceName: 'Studio da Ana',
    };

    return {
      rendered: renderTemplate(body.message, exampleContext),
      context: exampleContext,
    };
  }

  /**
   * POST /message-templates/generate-link
   * Gera link do WhatsApp com mensagem renderizada
   * 
   * Recebe:
   * - eventType: tipo do evento
   * - phone: telefone do cliente
   * - context: variáveis para renderização
   */
  @Patch('generate-link')
  async generateLink(
    @Req() req: any,
    @Body() body: {
      eventType: string;
      phone: string;
      context: Record<string, string>;
    },
  ) {
    try {
      // Busca template
      const template = await this.service.findByEventType(
        req.user.workspaceId, 
        body.eventType as MessageEventType
      );
      
      // Renderiza mensagem
      const rendered = renderTemplate(template.message, body.context);
      
      // Gera link
      const whatsappLink = generateWhatsAppLink(body.phone, rendered);

      return {
        message: rendered,
        whatsappLink,
      };
    } catch (error) {
      console.error('Erro ao gerar link:', error);
      throw error;
    }
  }
}
