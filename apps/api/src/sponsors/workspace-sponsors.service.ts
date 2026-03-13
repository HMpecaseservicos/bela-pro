import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';
import { SponsorTier, SponsorScope, Prisma } from '@prisma/client';

// =============================================================================
// ZOD SCHEMAS - Simplificado para workspace sponsors
// =============================================================================

const createWorkspaceSponsorSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().max(500).optional(),
  logoLightUrl: z.string().optional().nullable(),
  logoDarkUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(60).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable(),
  tier: z.nativeEnum(SponsorTier).default(SponsorTier.SILVER),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

const updateWorkspaceSponsorSchema = createWorkspaceSponsorSchema.partial();

export type CreateWorkspaceSponsorDto = z.infer<typeof createWorkspaceSponsorSchema>;
export type UpdateWorkspaceSponsorDto = z.infer<typeof updateWorkspaceSponsorSchema>;

// Tier priority for ordering
const TIER_ORDER: Record<SponsorTier, number> = {
  DIAMOND: 4,
  GOLD: 3,
  SILVER: 2,
  BRONZE: 1,
};

@Injectable()
export class WorkspaceSponsorsService {
  private readonly logger = new Logger(WorkspaceSponsorsService.name);

  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // VERIFICAÇÕES
  // ===========================================================================

  /**
   * Verifica se o workspace pode criar patrocinadores locais
   */
  private async checkWorkspaceCanCreateSponsor(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        localSponsorsEnabled: true,
        localSponsorsLimit: true,
        _count: {
          select: {
            localSponsors: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    if (!workspace.localSponsorsEnabled) {
      throw new ForbiddenException('Patrocinadores locais não estão habilitados para este workspace. Atualize seu plano para habilitar.');
    }

    // Limite 0 = sem limite (enterprise)
    if (workspace.localSponsorsLimit > 0 && workspace._count.localSponsors >= workspace.localSponsorsLimit) {
      throw new ForbiddenException(`Limite de ${workspace.localSponsorsLimit} patrocinadores locais atingido. Atualize seu plano para mais.`);
    }
  }

  /**
   * Retorna as configurações de patrocinadores do workspace
   */
  async getWorkspaceSettings(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        showGlobalSponsors: true,
        localSponsorsEnabled: true,
        localSponsorsLimit: true,
        _count: {
          select: {
            localSponsors: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    return {
      showGlobalSponsors: workspace.showGlobalSponsors,
      localSponsorsEnabled: workspace.localSponsorsEnabled,
      localSponsorsLimit: workspace.localSponsorsLimit,
      currentCount: workspace._count.localSponsors,
      remaining: workspace.localSponsorsLimit === 0 ? -1 : workspace.localSponsorsLimit - workspace._count.localSponsors,
    };
  }

  /**
   * Atualiza configurações de exibição de sponsors globais
   */
  async updateShowGlobalSponsors(workspaceId: string, showGlobal: boolean) {
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { showGlobalSponsors: showGlobal },
    });

    return { showGlobalSponsors: showGlobal };
  }

  // ===========================================================================
  // CRUD
  // ===========================================================================

  async create(workspaceId: string, raw: unknown, userId: string) {
    // Verificar permissão
    await this.checkWorkspaceCanCreateSponsor(workspaceId);

    const data = createWorkspaceSponsorSchema.parse(raw);

    // Check slug uniqueness within workspace
    const existing = await this.prisma.sponsor.findFirst({
      where: {
        slug: data.slug,
        workspaceId,
      },
    });
    if (existing) throw new BadRequestException('Slug já está em uso neste workspace');

    return this.prisma.sponsor.create({
      data: {
        ...data,
        scope: SponsorScope.WORKSPACE,
        workspaceId,
        createdByUserId: userId,
        updatedByUserId: userId,
        // Campos não usados em workspace sponsors, mas fixos
        sponsorType: 'BRAND',
        placementScopes: ['ALL'],
        isFeatured: false,
        trackingEnabled: true,
      },
    });
  }

  async update(workspaceId: string, id: string, raw: unknown, userId: string) {
    const data = updateWorkspaceSponsorSchema.parse(raw);

    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    // Se mudar slug, verificar unicidade
    if (data.slug && data.slug !== sponsor.slug) {
      const existing = await this.prisma.sponsor.findFirst({
        where: { slug: data.slug, workspaceId },
      });
      if (existing) throw new BadRequestException('Slug já está em uso');
    }

    return this.prisma.sponsor.update({
      where: { id },
      data: { ...data, updatedByUserId: userId },
    });
  }

  async delete(workspaceId: string, id: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.delete({ where: { id } });
  }

  async findAllByWorkspace(workspaceId: string, filters?: { isActive?: boolean; search?: string }) {
    const where: Prisma.SponsorWhereInput = {
      workspaceId,
      scope: SponsorScope.WORKSPACE,
    };

    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const sponsors = await this.prisma.sponsor.findMany({
      where,
      orderBy: [
        { displayOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return sponsors;
  }

  async findOneByWorkspace(workspaceId: string, id: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id, workspaceId },
    });

    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return sponsor;
  }

  async reorder(workspaceId: string, items: { id: string; displayOrder: number }[]) {
    // Verificar que todos os itens pertencem ao workspace
    const sponsorIds = items.map(i => i.id);
    const sponsors = await this.prisma.sponsor.findMany({
      where: { id: { in: sponsorIds }, workspaceId },
      select: { id: true },
    });

    if (sponsors.length !== items.length) {
      throw new BadRequestException('Um ou mais patrocinadores não pertencem a este workspace');
    }

    await this.prisma.$transaction(
      items.map(item =>
        this.prisma.sponsor.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        }),
      ),
    );

    return { success: true };
  }

  async activate(workspaceId: string, id: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.update({ where: { id }, data: { isActive: true } });
  }

  async deactivate(workspaceId: string, id: string) {
    const sponsor = await this.prisma.sponsor.findFirst({
      where: { id, workspaceId },
    });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.update({ where: { id }, data: { isActive: false } });
  }

  // ===========================================================================
  // PUBLIC - Para booking page
  // ===========================================================================

  /**
   * Busca sponsors para exibição pública na página de booking
   * Combina sponsors locais do workspace + globais (se habilitado)
   */
  async getSponsorsForBookingPage(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        showGlobalSponsors: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado');
    }

    // Buscar sponsors locais do workspace
    const localSponsors = await this.prisma.sponsor.findMany({
      where: {
        workspaceId,
        scope: SponsorScope.WORKSPACE,
        isActive: true,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
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
        isFeatured: true,
      },
    });

    let globalSponsors: typeof localSponsors = [];

    // Se workspace exibe sponsors globais, buscar também
    if (workspace.showGlobalSponsors) {
      const now = new Date();
      globalSponsors = await this.prisma.sponsor.findMany({
        where: {
          scope: SponsorScope.GLOBAL,
          workspaceId: null,
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
          ],
        },
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
          isFeatured: true,
        },
      });
    }

    // Organizar por tier
    const allSponsors = [...localSponsors, ...globalSponsors];
    allSponsors.sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (TIER_ORDER[b.tier] || 0) - (TIER_ORDER[a.tier] || 0);
    });

    return {
      showGlobalSponsors: workspace.showGlobalSponsors,
      sponsors: allSponsors,
      localCount: localSponsors.length,
      globalCount: globalSponsors.length,
    };
  }
}
