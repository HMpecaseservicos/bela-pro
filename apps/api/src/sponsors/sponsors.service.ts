import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import { SponsorTier, SponsorType, SponsorPlacement, Prisma } from '@prisma/client';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const createSponsorSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(500).optional(),
  logoLightUrl: z.string().url().optional().nullable(),
  logoDarkUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(60).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable(),
  tier: z.nativeEnum(SponsorTier).default(SponsorTier.SILVER),
  sponsorType: z.nativeEnum(SponsorType).default(SponsorType.BRAND),
  placementScopes: z.array(z.nativeEnum(SponsorPlacement)).default([SponsorPlacement.ALL]),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  contractStartsAt: z.string().datetime().optional().nullable(),
  contractEndsAt: z.string().datetime().optional().nullable(),
  trackingEnabled: z.boolean().default(true),
  notes: z.string().max(1000).optional().nullable(),
});

const updateSponsorSchema = createSponsorSchema.partial();

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    displayOrder: z.number().int().min(0),
  })),
});

export type CreateSponsorDto = z.infer<typeof createSponsorSchema>;
export type UpdateSponsorDto = z.infer<typeof updateSponsorSchema>;
export type ReorderDto = z.infer<typeof reorderSchema>;

// Tier priority for ordering (higher = more priority)
const TIER_ORDER: Record<SponsorTier, number> = {
  DIAMOND: 4,
  GOLD: 3,
  SILVER: 2,
  BRONZE: 1,
};

@Injectable()
export class SponsorsService {
  private readonly logger = new Logger(SponsorsService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // ADMIN METHODS
  // ===========================================================================

  async create(raw: unknown, userId: string) {
    const data = createSponsorSchema.parse(raw);

    // Check slug uniqueness
    const existing = await this.prisma.sponsor.findUnique({ where: { slug: data.slug } });
    if (existing) throw new BadRequestException('Slug já está em uso');

    return this.prisma.sponsor.create({
      data: {
        ...data,
        contractStartsAt: data.contractStartsAt ? new Date(data.contractStartsAt) : null,
        contractEndsAt: data.contractEndsAt ? new Date(data.contractEndsAt) : null,
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
  }

  async update(id: string, raw: unknown, userId: string) {
    const data = updateSponsorSchema.parse(raw);

    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    // If slug changes, check uniqueness
    if (data.slug && data.slug !== sponsor.slug) {
      const existing = await this.prisma.sponsor.findUnique({ where: { slug: data.slug } });
      if (existing) throw new BadRequestException('Slug já está em uso');
    }

    const updateData: Prisma.SponsorUpdateInput = { ...data, updatedByUserId: userId };
    if (data.contractStartsAt !== undefined) {
      updateData.contractStartsAt = data.contractStartsAt ? new Date(data.contractStartsAt) : null;
    }
    if (data.contractEndsAt !== undefined) {
      updateData.contractEndsAt = data.contractEndsAt ? new Date(data.contractEndsAt) : null;
    }

    return this.prisma.sponsor.update({ where: { id }, data: updateData });
  }

  async delete(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.delete({ where: { id } });
  }

  async findAll(filters?: { tier?: SponsorTier; sponsorType?: SponsorType; isActive?: boolean; search?: string }) {
    const where: Prisma.SponsorWhereInput = {};

    if (filters?.tier) where.tier = filters.tier;
    if (filters?.sponsorType) where.sponsorType = filters.sponsorType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.sponsor.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async reorder(raw: unknown) {
    const data = reorderSchema.parse(raw);

    await this.prisma.$transaction(
      data.items.map(item =>
        this.prisma.sponsor.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    return { success: true };
  }

  async activate(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.update({ where: { id }, data: { isActive: true } });
  }

  async deactivate(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.update({ where: { id }, data: { isActive: false } });
  }

  // ===========================================================================
  // PUBLIC METHODS
  // ===========================================================================

  private buildPublicWhere(placement?: SponsorPlacement): Prisma.SponsorWhereInput {
    const now = new Date();
    return {
      isActive: true,
      OR: [
        { contractStartsAt: null },
        { contractStartsAt: { lte: now } },
      ],
      AND: [
        {
          OR: [
            { contractEndsAt: null },
            { contractEndsAt: { gte: now } },
          ],
        },
        placement ? {
          OR: [
            { placementScopes: { has: placement } },
            { placementScopes: { has: SponsorPlacement.ALL } },
          ],
        } : {},
      ],
    };
  }

  async findPublic(placement?: SponsorPlacement) {
    const sponsors = await this.prisma.sponsor.findMany({
      where: this.buildPublicWhere(placement),
      orderBy: [
        { isFeatured: 'desc' },
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoLightUrl: true,
        logoDarkUrl: true,
        coverImageUrl: true,
        websiteUrl: true,
        ctaLabel: true,
        ctaUrl: true,
        tier: true,
        sponsorType: true,
        isFeatured: true,
      },
    });

    // Sort by tier priority in application layer
    sponsors.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (TIER_ORDER[b.tier] || 0) - (TIER_ORDER[a.tier] || 0);
    });

    return sponsors;
  }

  async findFeatured() {
    return this.prisma.sponsor.findMany({
      where: {
        ...this.buildPublicWhere(),
        isFeatured: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoLightUrl: true,
        logoDarkUrl: true,
        websiteUrl: true,
        ctaLabel: true,
        ctaUrl: true,
        tier: true,
        isFeatured: true,
      },
    });
  }

  async trackView(ids: string[]) {
    if (!ids.length) return;

    await this.prisma.sponsor.updateMany({
      where: { id: { in: ids }, trackingEnabled: true },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  }

  async trackClick(id: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');
    if (!sponsor.trackingEnabled) return { success: true };

    await this.prisma.sponsor.update({
      where: { id },
      data: {
        clickCount: { increment: 1 },
        lastClickedAt: new Date(),
      },
    });

    return { success: true };
  }
}
