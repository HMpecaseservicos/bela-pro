import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import { AdminMessageType, Prisma } from '@prisma/client';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const createAdminMessageSchema = z.object({
  title: z.string().min(3).max(200),
  content: z.string().min(10).max(2000),
  type: z.nativeEnum(AdminMessageType).default(AdminMessageType.INFO),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  actionLabel: z.string().max(60).optional().nullable(),
  actionUrl: z.string().url().optional().nullable(),
  dismissible: z.boolean().default(true),
  targetPlans: z.array(z.string()).default([]),
});

const updateAdminMessageSchema = createAdminMessageSchema.partial();

export type CreateAdminMessageDto = z.infer<typeof createAdminMessageSchema>;
export type UpdateAdminMessageDto = z.infer<typeof updateAdminMessageSchema>;

// Message type icons
const TYPE_ICONS: Record<AdminMessageType, string> = {
  INFO: '📢',
  UPDATE: '🚀',
  MAINTENANCE: '🔧',
  FEATURE: '✨',
  WARNING: '⚠️',
  PROMOTION: '🎁',
};

@Injectable()
export class AdminMessagesService {
  private readonly logger = new Logger(AdminMessagesService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // SUPER ADMIN METHODS
  // ===========================================================================

  /**
   * Cria uma nova mensagem do admin
   */
  async create(raw: unknown, userId: string) {
    const data = createAdminMessageSchema.parse(raw);

    return this.prisma.adminMessage.create({
      data: {
        title: data.title,
        content: data.content,
        type: data.type,
        isActive: data.isActive,
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        icon: data.icon || TYPE_ICONS[data.type],
        actionLabel: data.actionLabel,
        actionUrl: data.actionUrl,
        dismissible: data.dismissible,
        targetPlans: data.targetPlans,
        createdByUserId: userId,
      },
    });
  }

  /**
   * Atualiza uma mensagem existente
   */
  async update(id: string, raw: unknown) {
    const data = updateAdminMessageSchema.parse(raw);

    const message = await this.prisma.adminMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    const updateData: Prisma.AdminMessageUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) {
      updateData.type = data.type;
      // Se não tiver icon personalizado, atualizar com o do novo tipo
      if (!data.icon && !message.icon?.includes('://')) {
        updateData.icon = TYPE_ICONS[data.type];
      }
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.startsAt !== undefined) updateData.startsAt = new Date(data.startsAt);
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.actionLabel !== undefined) updateData.actionLabel = data.actionLabel;
    if (data.actionUrl !== undefined) updateData.actionUrl = data.actionUrl;
    if (data.dismissible !== undefined) updateData.dismissible = data.dismissible;
    if (data.targetPlans !== undefined) updateData.targetPlans = data.targetPlans;

    return this.prisma.adminMessage.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Remove uma mensagem
   */
  async delete(id: string) {
    const message = await this.prisma.adminMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    // Remover dismissals relacionados também
    await this.prisma.adminMessageDismissal.deleteMany({ where: { messageId: id } });

    return this.prisma.adminMessage.delete({ where: { id } });
  }

  /**
   * Lista todas as mensagens para admin
   */
  async findAll(filters?: { isActive?: boolean; type?: AdminMessageType; search?: string }) {
    const where: Prisma.AdminMessageWhereInput = {};

    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.type) where.type = filters.type;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.adminMessage.findMany({
      where,
      orderBy: [
        { isActive: 'desc' },
        { startsAt: 'desc' },
      ],
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });
  }

  /**
   * Busca uma mensagem específica com estatísticas
   */
  async findOne(id: string) {
    const message = await this.prisma.adminMessage.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });

    if (!message) throw new NotFoundException('Mensagem não encontrada');

    // Contar workspaces totais para % de dismissals
    const totalWorkspaces = await this.prisma.workspace.count({ where: { isActive: true } });

    return {
      ...message,
      totalWorkspaces,
      dismissalRate: totalWorkspaces > 0 
        ? Math.round((message._count.dismissals / totalWorkspaces) * 100) 
        : 0,
    };
  }

  /**
   * Ativa uma mensagem
   */
  async activate(id: string) {
    const message = await this.prisma.adminMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    return this.prisma.adminMessage.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Desativa uma mensagem
   */
  async deactivate(id: string) {
    const message = await this.prisma.adminMessage.findUnique({ where: { id } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    return this.prisma.adminMessage.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // WORKSPACE METHODS - Para exibição no dashboard do usuário
  // ===========================================================================

  /**
   * Busca mensagens ativas para um workspace específico
   * Filtra por plano e mensagens não dispensadas
   */
  async getActiveMessagesForWorkspace(workspaceId: string, workspacePlan?: string) {
    const now = new Date();

    // Buscar IDs de mensagens já dispensadas por este workspace
    const dismissedIds = await this.prisma.adminMessageDismissal.findMany({
      where: { workspaceId },
      select: { messageId: true },
    });
    const dismissedSet = new Set(dismissedIds.map(d => d.messageId));

    // Buscar mensagens ativas
    const messages = await this.prisma.adminMessage.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: [
        { type: 'asc' }, // WARNING primeiro
        { startsAt: 'desc' },
      ],
    });

    // Filtrar por plano e mensagens não dispensadas
    return messages.filter(msg => {
      // Se foi dispensada, não mostrar
      if (dismissedSet.has(msg.id)) return false;

      // Se tem planos específicos, verificar se workspace está incluído
      if (msg.targetPlans.length > 0 && workspacePlan) {
        return msg.targetPlans.includes(workspacePlan);
      }

      // Se não tem filtro de plano, mostrar para todos
      return true;
    });
  }

  /**
   * Registra que um workspace dispensou uma mensagem
   */
  async dismissMessage(messageId: string, workspaceId: string) {
    const message = await this.prisma.adminMessage.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Mensagem não encontrada');

    if (!message.dismissible) {
      throw new BadRequestException('Esta mensagem não pode ser dispensada');
    }

    // Verificar se já foi dispensada
    const existing = await this.prisma.adminMessageDismissal.findUnique({
      where: {
        messageId_workspaceId: {
          messageId,
          workspaceId,
        },
      },
    });

    if (existing) {
      return { success: true, alreadyDismissed: true };
    }

    await this.prisma.adminMessageDismissal.create({
      data: {
        messageId,
        workspaceId,
      },
    });

    return { success: true, alreadyDismissed: false };
  }

  /**
   * Registra visualização de uma mensagem
   */
  async trackView(messageId: string) {
    await this.prisma.adminMessage.update({
      where: { id: messageId },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return { success: true };
  }
}
