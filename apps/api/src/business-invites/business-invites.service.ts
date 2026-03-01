import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessInviteStatus, InviteFocusType } from '@prisma/client';

export interface CreateInviteDto {
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  city?: string;
  focusType?: InviteFocusType;
  personalMessage?: string;
  notes?: string;
  expiresInDays?: number;
}

export interface UpdateInviteDto {
  businessName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  focusType?: InviteFocusType;
  personalMessage?: string;
  notes?: string;
  status?: BusinessInviteStatus;
}

export interface InviteFilters {
  status?: BusinessInviteStatus;
  focusType?: InviteFocusType;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BusinessInvitesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo convite de empresa
   */
  async createInvite(sentById: string, data: CreateInviteDto) {
    // Normaliza o telefone
    const phone = this.normalizePhone(data.phone);
    
    // Verifica se já existe convite para este telefone que ainda está ativo
    const existingInvite = await this.prisma.businessInvite.findFirst({
      where: {
        phone,
        status: {
          in: ['PENDING', 'VIEWED', 'CLICKED_CTA'],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (existingInvite) {
      throw new BadRequestException(
        'Já existe um convite ativo para este telefone. Aguarde expirar ou cancele o anterior.'
      );
    }

    // Define data de expiração (padrão: 7 dias)
    const expiresInDays = data.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await this.prisma.businessInvite.create({
      data: {
        businessName: data.businessName,
        contactName: data.contactName,
        phone,
        email: data.email,
        city: data.city,
        focusType: data.focusType || 'RECOGNITION',
        personalMessage: data.personalMessage,
        notes: data.notes,
        expiresAt,
        sentById,
      },
      include: {
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return invite;
  }

  /**
   * Lista convites com filtros e paginação
   */
  async findAll(filters: InviteFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.focusType) {
      where.focusType = filters.focusType;
    }

    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [invites, total] = await Promise.all([
      this.prisma.businessInvite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sentBy: {
            select: {
              id: true,
              name: true,
            },
          },
          convertedWorkspace: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.businessInvite.count({ where }),
    ]);

    return {
      data: invites,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca convite por ID
   */
  async findById(id: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: { id },
      include: {
        sentBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        convertedWorkspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }

    return invite;
  }

  /**
   * Busca convite por token (para landing page pública)
   */
  async findByToken(token: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return null;
    }

    // Atualiza contagem de visualizações
    await this.prisma.businessInvite.update({
      where: { id: invite.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        status: invite.status === 'PENDING' ? 'VIEWED' : invite.status,
      },
    });

    return invite;
  }

  /**
   * Registra clique no CTA
   */
  async registerCtaClick(token: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invite.status === 'EXPIRED' || invite.status === 'CANCELLED') {
      throw new BadRequestException('Este convite não é mais válido');
    }

    await this.prisma.businessInvite.update({
      where: { id: invite.id },
      data: {
        ctaClickedAt: new Date(),
        status: 'CLICKED_CTA',
      },
    });

    return { success: true };
  }

  /**
   * Atualiza um convite
   */
  async update(id: string, data: UpdateInviteDto) {
    const invite = await this.findById(id);

    const updateData: any = { ...data };
    if (data.phone) {
      updateData.phone = this.normalizePhone(data.phone);
    }

    return this.prisma.businessInvite.update({
      where: { id: invite.id },
      data: updateData,
      include: {
        sentBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Cancela um convite
   */
  async cancel(id: string) {
    const invite = await this.findById(id);

    if (invite.status === 'REGISTERED' || invite.status === 'ACTIVATED') {
      throw new BadRequestException('Não é possível cancelar um convite já convertido');
    }

    return this.prisma.businessInvite.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  /**
   * Reativa um convite expirado/cancelado
   */
  async reactivate(id: string, expiresInDays: number = 7) {
    const invite = await this.findById(id);

    if (invite.status === 'REGISTERED' || invite.status === 'ACTIVATED') {
      throw new BadRequestException('Convite já convertido não pode ser reativado');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return this.prisma.businessInvite.update({
      where: { id },
      data: {
        status: 'PENDING',
        expiresAt,
      },
    });
  }

  /**
   * Marca convite como enviado por WhatsApp
   */
  async markSentViaWhatsApp(id: string) {
    return this.prisma.businessInvite.update({
      where: { id },
      data: {
        sentViaWhatsApp: true,
        whatsappSentAt: new Date(),
      },
    });
  }

  /**
   * Marca convite como enviado por Email
   */
  async markSentViaEmail(id: string) {
    return this.prisma.businessInvite.update({
      where: { id },
      data: {
        sentViaEmail: true,
        emailSentAt: new Date(),
      },
    });
  }

  /**
   * Vincula workspace convertido ao convite
   */
  async linkConvertedWorkspace(token: string, workspaceId: string) {
    const invite = await this.prisma.businessInvite.findUnique({
      where: { token },
    });

    if (!invite) {
      return null; // Silencioso - pode não ter vindo de convite
    }

    return this.prisma.businessInvite.update({
      where: { id: invite.id },
      data: {
        status: 'REGISTERED',
        registeredAt: new Date(),
        convertedWorkspaceId: workspaceId,
      },
    });
  }

  /**
   * Dashboard de métricas de convites
   */
  async getDashboardMetrics() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalInvites,
      pendingInvites,
      viewedInvites,
      clickedInvites,
      registeredInvites,
      activatedInvites,
      expiredInvites,
      last30DaysInvites,
      last30DaysRegistered,
      byFocusType,
    ] = await Promise.all([
      this.prisma.businessInvite.count(),
      this.prisma.businessInvite.count({ where: { status: 'PENDING' } }),
      this.prisma.businessInvite.count({ where: { status: 'VIEWED' } }),
      this.prisma.businessInvite.count({ where: { status: 'CLICKED_CTA' } }),
      this.prisma.businessInvite.count({ where: { status: 'REGISTERED' } }),
      this.prisma.businessInvite.count({ where: { status: 'ACTIVATED' } }),
      this.prisma.businessInvite.count({ where: { status: 'EXPIRED' } }),
      this.prisma.businessInvite.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.businessInvite.count({
        where: {
          status: { in: ['REGISTERED', 'ACTIVATED'] },
          registeredAt: { gte: thirtyDaysAgo },
        },
      }),
      this.prisma.businessInvite.groupBy({
        by: ['focusType'],
        _count: { _all: true },
      }),
    ]);

    // Taxa de conversão
    const conversionRate = totalInvites > 0
      ? ((registeredInvites + activatedInvites) / totalInvites * 100).toFixed(1)
      : 0;

    const viewToClickRate = viewedInvites > 0
      ? ((clickedInvites + registeredInvites + activatedInvites) / viewedInvites * 100).toFixed(1)
      : 0;

    return {
      totals: {
        total: totalInvites,
        pending: pendingInvites,
        viewed: viewedInvites,
        clicked: clickedInvites,
        registered: registeredInvites,
        activated: activatedInvites,
        expired: expiredInvites,
      },
      last30Days: {
        sent: last30DaysInvites,
        registered: last30DaysRegistered,
      },
      rates: {
        conversionRate: Number(conversionRate),
        viewToClickRate: Number(viewToClickRate),
      },
      byFocusType: byFocusType.map((item) => ({
        focusType: item.focusType,
        count: item._count._all,
      })),
    };
  }

  /**
   * Expira convites vencidos (cron job)
   */
  async expireOldInvites() {
    const now = new Date();

    const result = await this.prisma.businessInvite.updateMany({
      where: {
        status: {
          in: ['PENDING', 'VIEWED', 'CLICKED_CTA'],
        },
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return { expiredCount: result.count };
  }

  /**
   * Gera link do convite
   */
  getInviteLink(token: string, baseUrl: string = 'https://bela-pro.netlify.app') {
    return `${baseUrl}/convite-empresa/${token}`;
  }

  /**
   * Gera mensagem de WhatsApp personalizada
   */
  generateWhatsAppMessage(invite: any, baseUrl: string = 'https://bela-pro.netlify.app') {
    const link = this.getInviteLink(invite.token, baseUrl);
    const focusMessages = this.getFocusMessages(invite.focusType);

    let message = `Olá ${invite.contactName}! 👋\n\n`;
    
    if (invite.personalMessage) {
      message += `${invite.personalMessage}\n\n`;
    }

    message += `${focusMessages.intro}\n\n`;
    message += `${focusMessages.benefit}\n\n`;
    message += `🎁 Preparamos um convite especial para você experimentar o Bela Pro *gratuitamente por 14 dias*!\n\n`;
    message += `👉 Acesse agora: ${link}\n\n`;
    message += `${focusMessages.closing}`;

    return message;
  }

  /**
   * Mensagens personalizadas por tipo de foco
   */
  private getFocusMessages(focusType: InviteFocusType) {
    const messages = {
      YOUTH_BEAUTY: {
        intro: '✨ Você que transforma a autoestima das suas clientes, merece uma ferramenta que valorize o seu trabalho.',
        benefit: '💄 Com o Bela Pro, suas clientes saem não apenas mais bonitas, mas *mais confiantes*. E você? Mais organizada, com mais tempo e mais lucro.',
        closing: 'Faça parte das profissionais que estão revolucionando a beleza! ✨',
      },
      INCOME_GROWTH: {
        intro: '💰 Cansada de trabalhar muito e ganhar pouco? O Bela Pro foi feito para mudar isso!',
        benefit: '📈 Profissionais que usam o Bela Pro *aumentaram seus ganhos em até 40%* reduzindo faltas, organizando a agenda e fidelizando clientes.',
        closing: 'Chegou a sua vez de ganhar o que você realmente merece! 💪',
      },
      RECOGNITION: {
        intro: '🏆 Seu talento merece ser reconhecido! O Bela Pro é a ferramenta das profissionais de sucesso.',
        benefit: '⭐ Com agenda profissional, lembretes automáticos e atendimento VIP pelo WhatsApp, suas clientes vão perceber que você é *diferenciada*.',
        closing: 'Destaque-se no mercado e conquiste o reconhecimento que você merece! 👑',
      },
    };

    return messages[focusType] || messages.RECOGNITION;
  }

  /**
   * Normaliza telefone para formato padrão
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
