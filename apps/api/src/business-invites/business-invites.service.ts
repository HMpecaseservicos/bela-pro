import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BusinessInviteStatus, InviteFocusType, InviteType } from '@prisma/client';
import { z } from 'zod';

const createInviteSchema = z.object({
  businessName: z.string().min(1, 'Nome obrigatório').max(200),
  contactName: z.string().min(1, 'Nome do contato obrigatório').max(200),
  phone: z.string().min(8, 'Telefone inválido').max(20),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  city: z.string().max(100).optional(),
  focusType: z.enum(['YOUTH_BEAUTY', 'INCOME_GROWTH', 'RECOGNITION']).optional(),
  personalMessage: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const createPublicInviteSchema = z.object({
  campaignName: z.string().min(1, 'Nome da campanha obrigatório').max(200),
  slug: z.string().max(100).optional(),
  focusType: z.enum(['YOUTH_BEAUTY', 'INCOME_GROWTH', 'RECOGNITION']).optional(),
  personalMessage: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

const updateInviteSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  contactName: z.string().min(1).max(200).optional(),
  phone: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  city: z.string().max(100).optional(),
  focusType: z.enum(['YOUTH_BEAUTY', 'INCOME_GROWTH', 'RECOGNITION']).optional(),
  personalMessage: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  campaignName: z.string().min(1).max(200).optional(),
  slug: z.string().max(100).optional(),
});

export type CreateInviteDto = z.infer<typeof createInviteSchema>;
export type CreatePublicInviteDto = z.infer<typeof createPublicInviteSchema>;
export type UpdateInviteDto = z.infer<typeof updateInviteSchema>;

export interface InviteFilters {
  status?: BusinessInviteStatus;
  focusType?: InviteFocusType;
  inviteType?: InviteType;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class BusinessInvitesService {
  private readonly logger = new Logger(BusinessInvitesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo convite de empresa
   */
  async createInvite(sentById: string, raw: CreateInviteDto) {
    const data = createInviteSchema.parse(raw);
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
        inviteType: 'PERSONAL',
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
   * Cria um convite público para divulgação em redes sociais
   */
  async createPublicInvite(sentById: string, raw: CreatePublicInviteDto) {
    const data = createPublicInviteSchema.parse(raw);
    let slug = data.slug;
    if (slug) {
      slug = this.normalizeSlug(slug);
      
      // Verifica se já existe esse slug
      const existingSlug = await this.prisma.businessInvite.findUnique({
        where: { slug },
      });
      
      if (existingSlug) {
        throw new BadRequestException(`O slug "${slug}" já está em uso. Escolha outro.`);
      }
    }

    // Define data de expiração (padrão: 30 dias para campanhas)
    const expiresInDays = data.expiresInDays || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await this.prisma.businessInvite.create({
      data: {
        inviteType: 'PUBLIC',
        campaignName: data.campaignName,
        slug,
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
   * Normaliza slug para URL amigável
   */
  private normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres especiais por hífen
      .replace(/^-|-$/g, ''); // Remove hífens no início/fim
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

    if (filters.inviteType) {
      where.inviteType = filters.inviteType;
    }

    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { campaignName: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
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
   * Busca convite por token ou slug (para landing page pública)
   */
  async findByToken(tokenOrSlug: string) {
    // Tenta encontrar por token primeiro, depois por slug
    let invite = await this.prisma.businessInvite.findUnique({
      where: { token: tokenOrSlug },
    });

    if (!invite) {
      invite = await this.prisma.businessInvite.findUnique({
        where: { slug: tokenOrSlug },
      });
    }

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
  async registerCtaClick(tokenOrSlug: string) {
    // Tenta encontrar por token primeiro, depois por slug
    let invite = await this.prisma.businessInvite.findUnique({
      where: { token: tokenOrSlug },
    });

    if (!invite) {
      invite = await this.prisma.businessInvite.findUnique({
        where: { slug: tokenOrSlug },
      });
    }

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invite.status === 'EXPIRED' || invite.status === 'CANCELLED') {
      throw new BadRequestException('Este convite não é mais válido');
    }

    // Para convites públicos, incrementa o contador de cliques
    if (invite.inviteType === 'PUBLIC') {
      await this.prisma.businessInvite.update({
        where: { id: invite.id },
        data: {
          totalClicks: { increment: 1 },
          ctaClickedAt: new Date(),
        },
      });
    } else {
      await this.prisma.businessInvite.update({
        where: { id: invite.id },
        data: {
          ctaClickedAt: new Date(),
          status: 'CLICKED_CTA',
        },
      });
    }

    return { success: true };
  }

  /**
   * Atualiza um convite
   */
  async update(id: string, raw: UpdateInviteDto) {
    const data = updateInviteSchema.parse(raw);
    const invite = await this.findById(id);

    const updateData: Partial<typeof data> & { phone?: string } = { ...data };
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
   * Expira convites vencidos — roda automaticamente a cada hora
   */
  @Cron(CronExpression.EVERY_HOUR)
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

    if (result.count > 0) {
      this.logger.log(`Expirados ${result.count} convite(s) vencido(s)`);
    }

    return { expiredCount: result.count };
  }

  /**
   * Exporta convites filtrados para CSV
   */
  async exportToCsv(filters: Omit<InviteFilters, 'page' | 'limit'>): Promise<string> {
    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.focusType) where.focusType = filters.focusType;
    if (filters.inviteType) where.inviteType = filters.inviteType;
    if (filters.search) {
      where.OR = [
        { businessName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { campaignName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const invites = await this.prisma.businessInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { sentBy: { select: { name: true } }, convertedWorkspace: { select: { name: true } } },
    });

    const header = 'Tipo,Nome,Contato,Telefone,Email,Cidade,Foco,Status,Visualizações,Cliques,Criado,Expira,Convertido Para';
    const rows = invites.map((i) => {
      const esc = (v: string | null | undefined) => {
        if (!v) return '';
        return `"${v.replace(/"/g, '""')}"`;
      };
      return [
        i.inviteType,
        esc(i.inviteType === 'PUBLIC' ? i.campaignName : i.businessName),
        esc(i.contactName),
        esc(i.phone),
        esc(i.email),
        esc(i.city),
        i.focusType,
        i.status,
        i.viewCount,
        i.totalClicks ?? 0,
        i.createdAt.toISOString().slice(0, 10),
        i.expiresAt.toISOString().slice(0, 10),
        esc(i.convertedWorkspace?.name),
      ].join(',');
    });

    return '\uFEFF' + [header, ...rows].join('\n');
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
        intro: '✨ Você que transforma a vida dos seus clientes, merece uma ferramenta que valorize o seu trabalho.',
        benefit: '📈 Com o Bela Pro, seus clientes saem mais satisfeitos. E você? Mais organizado(a), com mais tempo e mais lucro.',
        closing: 'Faça parte dos profissionais que estão crescendo com o Bela Pro! ✨',
      },
      INCOME_GROWTH: {
        intro: '💰 Cansado(a) de trabalhar muito e ganhar pouco? O Bela Pro foi feito para mudar isso!',
        benefit: '📈 Profissionais que usam o Bela Pro *aumentaram seus ganhos em até 40%* reduzindo faltas, organizando a agenda e fidelizando clientes.',
        closing: 'Chegou a sua vez de ganhar o que você realmente merece! 💪',
      },
      RECOGNITION: {
        intro: '🏆 Seu talento merece ser reconhecido! O Bela Pro é a ferramenta dos profissionais de sucesso.',
        benefit: '⭐ Com agenda profissional, lembretes automáticos e atendimento VIP pelo WhatsApp, seus clientes vão perceber que você é *diferenciado(a)*.',
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
