import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { hash } from '@node-rs/argon2';
import { z } from 'zod';

// =============================================================================
// SCHEMAS
// =============================================================================

const createInviteSchema = z.object({
  companyName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().min(8).max(20).optional().nullable(),
  personalMessage: z.string().max(2000).optional().nullable(),
  proposedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']).default('GOLD'),
  proposedType: z.enum(['BRAND', 'SUPPLIER', 'OFFICIAL_PARTNER', 'EDUCATIONAL_PARTNER', 'TECH_PARTNER', 'CAMPAIGN_PARTNER']).default('BRAND'),
  proposedBenefits: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(365).default(30),
  notes: z.string().max(2000).optional().nullable(),
});

const createUniversalInviteSchema = z.object({
  universalTitle: z.string().max(200).optional().nullable(),
  personalMessage: z.string().max(2000).optional().nullable(),
  proposedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']).default('GOLD'),
  proposedBenefits: z.array(z.string()).default([]),
  expiresInDays: z.number().min(1).max(365).default(90),
  notes: z.string().max(2000).optional().nullable(),
});

const selfRegisterSchema = z.object({
  // Dados da empresa
  companyName: z.string().min(2).max(120),
  contactName: z.string().min(2).max(120),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(8).max(20).optional().nullable(),
  companyDocument: z.string().max(30).optional().nullable(),
  companyAddress: z.string().max(300).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  // Parceria escolhida
  selectedTier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'BRONZE']),
  selectedType: z.enum(['BRAND', 'SUPPLIER', 'OFFICIAL_PARTNER', 'EDUCATIONAL_PARTNER', 'TECH_PARTNER', 'CAMPAIGN_PARTNER']).default('BRAND'),
  durationMonths: z.number().min(1).max(36).default(6),
  // Senha (para Diamond terá acesso ao painel)
  password: z.string().min(6).max(200).optional(),
  // Aceite dos termos
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Você deve aceitar os termos do contrato' }) }),
  // Assinatura
  signedByName: z.string().min(2).max(120),
});

export type CreateSponsorInviteDto = z.infer<typeof createInviteSchema>;
export type SelfRegisterDto = z.infer<typeof selfRegisterSchema>;

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class SponsorInvitesService {
  private readonly logger = new Logger(SponsorInvitesService.name);

  constructor(private prisma: PrismaService) {}

  // ---- ADMIN ----

  async create(raw: unknown, userId: string) {
    const data = createInviteSchema.parse(raw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    return this.prisma.sponsorInvite.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail ?? null,
        contactPhone: data.contactPhone ?? null,
        personalMessage: data.personalMessage ?? null,
        proposedTier: data.proposedTier,
        proposedType: data.proposedType,
        proposedBenefits: data.proposedBenefits,
        notes: data.notes ?? null,
        expiresAt,
        createdByUserId: userId,
      },
    });
  }

  async createUniversal(raw: unknown, userId: string) {
    const data = createUniversalInviteSchema.parse(raw);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

    return this.prisma.sponsorInvite.create({
      data: {
        isUniversal: true,
        universalTitle: data.universalTitle ?? 'Seja nosso parceiro!',
        companyName: '',
        contactName: '',
        personalMessage: data.personalMessage ?? null,
        proposedTier: data.proposedTier,
        proposedBenefits: data.proposedBenefits,
        notes: data.notes ?? null,
        expiresAt,
        createdByUserId: userId,
      },
    });
  }

  async findAll(filters?: { status?: string; search?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { contactEmail: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.sponsorInvite.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    return invite;
  }

  async cancel(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    return this.prisma.sponsorInvite.delete({ where: { id } });
  }

  async resend(id: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { id } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.sponsorInvite.update({
      where: { id },
      data: { status: 'PENDING', expiresAt, viewCount: 0, ctaClickedAt: null, respondedAt: null },
    });
  }

  // ---- PUBLIC ----

  async findByToken(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      if (invite.status !== 'EXPIRED') {
        await this.prisma.sponsorInvite.update({ where: { id: invite.id }, data: { status: 'EXPIRED' } });
      }
      return { expired: true, companyName: invite.companyName || 'Convite', isUniversal: invite.isUniversal };
    }

    // Increment views
    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
        status: invite.status === 'PENDING' ? 'VIEWED' : undefined,
      },
    });

    return {
      expired: false,
      isUniversal: invite.isUniversal,
      universalTitle: invite.universalTitle,
      companyName: invite.companyName,
      contactName: invite.contactName,
      personalMessage: invite.personalMessage,
      proposedTier: invite.proposedTier,
      proposedType: invite.proposedType,
      proposedBenefits: invite.proposedBenefits,
      expiresAt: invite.expiresAt,
    };
  }

  async registerCtaClick(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: {
        ctaClickedAt: invite.ctaClickedAt ?? new Date(),
        status: ['PENDING', 'VIEWED'].includes(invite.status) ? 'CLICKED_CTA' : undefined,
      },
    });
    return { success: true };
  }

  async acceptInvite(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');
    if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado');
    }

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    });
    return { success: true, message: 'Parceria aceita com sucesso!' };
  }

  async declineInvite(token: string) {
    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    await this.prisma.sponsorInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });
    return { success: true };
  }

  // ---- SELF-REGISTRATION (from invite page) ----

  async selfRegister(token: string, raw: unknown, ip: string) {
    const data = selfRegisterSchema.parse(raw);

    const invite = await this.prisma.sponsorInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Convite não encontrado');

    // Universal invites can be reused; directed invites cannot be re-accepted
    if (!invite.isUniversal && ['EXPIRED', 'ACCEPTED', 'DECLINED'].includes(invite.status)) {
      throw new BadRequestException('Convite não disponível para cadastro');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Convite expirado');
    }

    // Check email uniqueness for sponsors
    const existingByEmail = await this.prisma.sponsor.findUnique({ where: { email: data.contactEmail } });
    if (existingByEmail) throw new BadRequestException('Email já está em uso por outro patrocinador');

    const slug = data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const existingSlug = await this.prisma.sponsor.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug;

    // Tier-specific benefits
    const benefits = this.getBenefitsForTier(data.selectedTier);
    const obligations = this.getObligationsForTier(data.selectedTier);

    // Calculate contract dates
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setMonth(endsAt.getMonth() + data.durationMonths);

    // Generate contract number
    const contractNumber = `BP-${data.selectedTier.charAt(0)}${data.selectedTier.charAt(1)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Hash password if provided (Diamond)
    let passwordHash: string | null = null;
    if (data.password && data.selectedTier === 'DIAMOND') {
      passwordHash = await hash(data.password);
    }

    // Transaction: create sponsor + contract + update invite
    const result = await this.prisma.$transaction(async (tx) => {
      const sponsor = await tx.sponsor.create({
        data: {
          name: data.companyName,
          slug: finalSlug,
          description: data.description,
          websiteUrl: data.websiteUrl,
          tier: data.selectedTier,
          sponsorType: data.selectedType,
          placementScopes: ['ALL'],
          isActive: true,
          contractStartsAt: startsAt,
          contractEndsAt: endsAt,
          email: data.contactEmail,
          passwordHash,
        },
      });

      const contract = await tx.sponsorContract.create({
        data: {
          contractNumber,
          sponsorId: sponsor.id,
          sponsorName: data.companyName,
          sponsorEmail: data.contactEmail,
          sponsorPhone: data.contactPhone,
          sponsorDocument: data.companyDocument,
          sponsorAddress: data.companyAddress,
          contactPersonName: data.contactName,
          tier: data.selectedTier,
          sponsorType: data.selectedType,
          benefits,
          obligations,
          startsAt,
          endsAt,
          durationMonths: data.durationMonths,
          status: 'ACTIVE',
          signedAt: new Date(),
          signedByName: data.signedByName,
          signedByIp: ip,
        },
      });

      // Update invite: universal stays active (increment usage), directed gets accepted
      if (invite.isUniversal) {
        await tx.sponsorInvite.update({
          where: { id: invite.id },
          data: {
            usageCount: { increment: 1 },
          },
        });
      } else {
        await tx.sponsorInvite.update({
          where: { id: invite.id },
          data: {
            status: 'ACCEPTED',
            respondedAt: new Date(),
            convertedSponsorId: sponsor.id,
          },
        });
      }

      return { sponsor, contract };
    });

    this.logger.log(`Self-registration: ${data.companyName} (${data.selectedTier}) — contract ${contractNumber}`);

    return {
      success: true,
      sponsorId: result.sponsor.id,
      contractNumber: result.contract.contractNumber,
      contractId: result.contract.id,
      tier: data.selectedTier,
      isDiamond: data.selectedTier === 'DIAMOND',
    };
  }

  // ---- CONTRACT GENERATION (for admin-created sponsors) ----

  async generateContract(sponsorId: string, durationMonths: number = 6) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    const startsAt = sponsor.contractStartsAt || new Date();
    const endsAt = new Date(startsAt);
    endsAt.setMonth(endsAt.getMonth() + durationMonths);

    const contractNumber = `BP-${sponsor.tier.charAt(0)}${sponsor.tier.charAt(1)}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const benefits = this.getBenefitsForTier(sponsor.tier);
    const obligations = this.getObligationsForTier(sponsor.tier);

    const contract = await this.prisma.sponsorContract.create({
      data: {
        contractNumber,
        sponsorId: sponsor.id,
        sponsorName: sponsor.name,
        sponsorEmail: sponsor.email,
        contactPersonName: sponsor.name,
        tier: sponsor.tier,
        sponsorType: sponsor.sponsorType,
        benefits,
        obligations,
        startsAt,
        endsAt,
        durationMonths,
        status: 'ACTIVE',
      },
    });

    // Update sponsor dates
    await this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { contractStartsAt: startsAt, contractEndsAt: endsAt },
    });

    return contract;
  }

  async getContract(contractId: string) {
    const contract = await this.prisma.sponsorContract.findUnique({
      where: { id: contractId },
      include: { sponsor: { select: { id: true, name: true, slug: true, tier: true, logoLightUrl: true } } },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async getContractByNumber(contractNumber: string) {
    const contract = await this.prisma.sponsorContract.findUnique({
      where: { contractNumber },
      include: { sponsor: { select: { id: true, name: true, slug: true, tier: true, logoLightUrl: true } } },
    });
    if (!contract) throw new NotFoundException('Contrato não encontrado');
    return contract;
  }

  async listContracts(filters?: { status?: string; sponsorId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.sponsorId) where.sponsorId = filters.sponsorId;

    return this.prisma.sponsorContract.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { sponsor: { select: { name: true, tier: true, logoLightUrl: true } } },
    });
  }

  async cancelContract(contractId: string, reason: string) {
    const contract = await this.prisma.sponsorContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new NotFoundException('Contrato não encontrado');

    return this.prisma.sponsorContract.update({
      where: { id: contractId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: reason },
    });
  }

  // ---- TIER DETAILS ----

  getTierDetails() {
    return {
      DIAMOND: {
        name: 'Diamond Partner',
        icon: '💎',
        color: '#a78bfa',
        priceLabel: 'Sob consulta',
        highlights: ['Painel exclusivo com analytics', 'Gestão própria de postagens e anúncios', 'Logo em todas as páginas da plataforma', 'Relatórios detalhados de performance', 'Destaque prioritário na plataforma', 'Badge "Parceiro Diamond Verificado"', 'Suporte dedicado e prioritário', 'Customização da área de parceiro'],
        placement: 'Todas as páginas (landing, booking, dashboard, marketing)',
        maxPosts: 'Ilimitado',
      },
      GOLD: {
        name: 'Gold Partner',
        icon: '🥇',
        color: '#f59e0b',
        priceLabel: 'Sob consulta',
        highlights: ['Logo na página de agendamento', 'Logo na landing page de convites', 'Relatório mensal de impressões e cliques', 'Badge "Parceiro Gold Verificado"', 'Até 5 postagens ativas por mês', 'Suporte por email'],
        placement: 'Landing de convite + Página de agendamento',
        maxPosts: '5 por mês',
      },
      SILVER: {
        name: 'Silver Partner',
        icon: '🥈',
        color: '#94a3b8',
        priceLabel: 'Sob consulta',
        highlights: ['Logo na página de agendamento', 'Relatório mensal de impressões', 'Badge "Parceiro Silver"', 'Até 2 postagens ativas por mês'],
        placement: 'Página de agendamento',
        maxPosts: '2 por mês',
      },
      BRONZE: {
        name: 'Bronze Partner',
        icon: '🥉',
        color: '#d97706',
        priceLabel: 'Gratuito',
        highlights: ['Menção na página de parceiros', 'Badge "Parceiro Bronze"', 'Relatório trimestral básico'],
        placement: 'Página de parceiros',
        maxPosts: 'Não incluído',
      },
    };
  }

  // ---- HELPERS ----

  private getBenefitsForTier(tier: string): string[] {
    const tierDetails = this.getTierDetails();
    return tierDetails[tier as keyof typeof tierDetails]?.highlights || [];
  }

  private getObligationsForTier(tier: string): string[] {
    const base = [
      'Manter informações de contato atualizadas',
      'Não utilizar a marca Bela Pro sem autorização prévia por escrito',
      'Respeitar os termos de uso da plataforma',
      'Não veicular conteúdo ofensivo, discriminatório ou ilegal',
    ];
    if (tier === 'DIAMOND' || tier === 'GOLD') {
      base.push('Fornecer materiais de marca (logo em alta resolução) em até 7 dias úteis');
      base.push('Manter conteúdo de postagens em conformidade com as diretrizes da plataforma');
    }
    return base;
  }

  // ---- CRON ----

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldInvites() {
    const result = await this.prisma.sponsorInvite.updateMany({
      where: { status: { in: ['PENDING', 'VIEWED', 'CLICKED_CTA'] }, expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    if (result.count > 0) this.logger.log(`Expirados ${result.count} convites de patrocinador`);
  }
}
