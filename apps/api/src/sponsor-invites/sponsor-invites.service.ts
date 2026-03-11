import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
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

export type CreateSponsorInviteDto = z.infer<typeof createInviteSchema>;

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
      return { expired: true, companyName: invite.companyName };
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
