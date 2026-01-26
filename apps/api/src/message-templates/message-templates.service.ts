/**
 * Message Templates Service
 * 
 * Responsável APENAS por:
 * - CRUD de templates
 * - Buscar template por workspace + eventType
 * - Tenant isolation (workspaceId sempre no WHERE)
 * 
 * NÃO acessa appointments, bookings ou regras de negócio.
 * 
 * @module message-templates
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessageEventType, MESSAGE_EVENTS } from './message-events';
import { z } from 'zod';

const updateTemplateSchema = z.object({
  message: z.string().min(1).max(2000),
  enabled: z.boolean().optional(),
  allowClientReply: z.boolean().optional(),
});

@Injectable()
export class MessageTemplatesService {
  private readonly logger = new Logger(MessageTemplatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista todos os templates do workspace
   * Retorna eventos padrão para os que não têm template personalizado
   */
  async findAll(workspaceId: string) {
    // Busca templates existentes
    const templates = await this.prisma.messageTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });

    // Mapeia templates existentes por eventType
    const templateMap = new Map(templates.map(t => [t.eventType, t]));

    // Retorna todos os eventos com template (existente ou padrão)
    return MESSAGE_EVENTS.map(event => {
      const existing = templateMap.get(event.type);
      
      if (existing) {
        return {
          id: existing.id,
          eventType: existing.eventType,
          label: event.label,
          description: event.description,
          message: existing.message,
          enabled: existing.enabled,
          allowClientReply: existing.allowClientReply,
          isCustomized: true,
        };
      }

      // Retorna evento com mensagem padrão (não salvo ainda)
      return {
        id: null,
        eventType: event.type,
        label: event.label,
        description: event.description,
        message: event.defaultMessage,
        enabled: true,
        allowClientReply: false,
        isCustomized: false,
      };
    });
  }

  /**
   * Busca um template específico por tipo de evento
   */
  async findByEventType(workspaceId: string, eventType: MessageEventType | string) {
    // Primeiro verifica se o evento existe nos metadados locais
    const eventMeta = MESSAGE_EVENTS.find(e => e.type === eventType);
    
    // Se o evento não está definido localmente, retorna erro
    if (!eventMeta) {
      throw new NotFoundException(`Tipo de evento não encontrado: ${eventType}`);
    }

    const normalizedEventType: MessageEventType = eventMeta.type;

    try {
      // TENANT ISOLATION: findFirst com workspaceId no WHERE
      const template = await this.prisma.messageTemplate.findFirst({
        where: { workspaceId, eventType: normalizedEventType },
      });

      if (template) {
        return template;
      }
    } catch (error) {
      // Se o enum não existe no banco ainda, ignora o erro
      this.logger.debug(`Template não encontrado no banco para ${eventType}, usando padrão`);
    }

    // Retorna template padrão se não existir personalizado
    return {
      id: null,
      workspaceId,
      eventType: normalizedEventType,
      message: eventMeta.defaultMessage,
      enabled: true,
      allowClientReply: false,
      isCustomized: false,
    };
  }

  /**
   * Cria ou atualiza um template
   */
  async upsert(workspaceId: string, eventType: MessageEventType, input: unknown) {
    const data = updateTemplateSchema.parse(input);

    // Verifica se evento é válido
    const eventMeta = MESSAGE_EVENTS.find(e => e.type === eventType);
    if (!eventMeta) {
      throw new NotFoundException('Tipo de evento não encontrado');
    }

    // Upsert: cria se não existe, atualiza se existe
    return this.prisma.messageTemplate.upsert({
      where: {
        workspaceId_eventType: { workspaceId, eventType },
      },
      create: {
        workspaceId,
        eventType,
        message: data.message,
        enabled: data.enabled ?? true,
        allowClientReply: data.allowClientReply ?? false,
      },
      update: {
        message: data.message,
        enabled: data.enabled,
        allowClientReply: data.allowClientReply,
      },
    });
  }

  /**
   * Ativa/desativa um template
   */
  async toggleEnabled(workspaceId: string, eventType: MessageEventType, enabled: boolean) {
    const existing = await this.prisma.messageTemplate.findFirst({
      where: { workspaceId, eventType },
    });

    if (!existing) {
      // Cria template com mensagem padrão
      const eventMeta = MESSAGE_EVENTS.find(e => e.type === eventType);
      if (!eventMeta) {
        throw new NotFoundException('Tipo de evento não encontrado');
      }

      return this.prisma.messageTemplate.create({
        data: {
          workspaceId,
          eventType,
          message: eventMeta.defaultMessage,
          enabled,
          allowClientReply: false,
        },
      });
    }

    // TENANT ISOLATION: updateMany com workspaceId no WHERE
    await this.prisma.messageTemplate.updateMany({
      where: { workspaceId, eventType },
      data: { enabled },
    });

    return this.findByEventType(workspaceId, eventType);
  }

  /**
   * Reseta template para mensagem padrão
   */
  async resetToDefault(workspaceId: string, eventType: MessageEventType) {
    const eventMeta = MESSAGE_EVENTS.find(e => e.type === eventType);
    if (!eventMeta) {
      throw new NotFoundException('Tipo de evento não encontrado');
    }

    // TENANT ISOLATION: deleteMany com workspaceId no WHERE
    await this.prisma.messageTemplate.deleteMany({
      where: { workspaceId, eventType },
    });

    return {
      eventType,
      message: eventMeta.defaultMessage,
      enabled: true,
      isCustomized: false,
    };
  }
}
