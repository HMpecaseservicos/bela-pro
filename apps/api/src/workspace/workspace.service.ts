import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const profileSchema = z.object({
  displayName: z.string().max(100).optional(),
  phoneE164: z.string().max(20).optional().nullable(),
  addressLine: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
}).optional();

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  brandName: z.string().max(100).optional().nullable(),
  primaryColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  accentColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  logoUrl: z.string().max(500).optional().nullable(), // Aceita URLs relativas ou absolutas
  coverImageUrl: z.string().max(500).optional().nullable(), // Aceita URLs relativas ou absolutas
  galleryUrls: z.array(z.string().max(500)).max(10).optional(),
  themePreset: z.enum(['rose_gold', 'burgundy', 'olive_green', 'classic_dark', 'ocean_blue', 'custom']).optional().nullable(),
  welcomeText: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  minLeadTimeMinutes: z.number().int().min(0).max(10080).optional(),
  bufferMinutes: z.number().int().min(0).max(120).optional(),
  maxBookingDaysAhead: z.number().int().min(1).max(365).optional(),
  slotIntervalMinutes: z.number().int().refine((v: number) => [15, 30, 60].includes(v)).optional(),
  slug: z.string().min(2).max(50).optional(),
  profile: profileSchema,
});

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca workspace por slug (para página pública)
   * Retorna TODAS as configurações necessárias para renderizar a página
   */
  async findBySlug(slug: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        timezone: true,
        // Identidade visual
        brandName: true,
        primaryColorHex: true,
        accentColorHex: true,
        logoUrl: true,
        coverImageUrl: true,
        galleryUrls: true,
        themePreset: true,
        // Textos customizáveis
        welcomeText: true,
        description: true,
        // Regras de agendamento (públicas)
        minLeadTimeMinutes: true,
        bufferMinutes: true,
        maxBookingDaysAhead: true,
        slotIntervalMinutes: true,
        // Profile
        profile: {
          select: {
            displayName: true,
            phoneE164: true,
            addressLine: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado.');
    }

    return workspace;
  }

  /**
   * Lista serviços públicos do workspace
   * Respeita: isActive, showInBooking, sortOrder
   */
  async getPublicServices(workspaceId: string) {
    return this.prisma.service.findMany({
      where: {
        workspaceId,
        isActive: true,
        showInBooking: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        imageUrl: true,
        badgeText: true,
        categoryTag: true,
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Atualiza configurações do workspace (autenticado)
   */
  async update(workspaceId: string, input: unknown) {
    const { profile, ...workspaceData } = updateWorkspaceSchema.parse(input);

    // Verifica se workspace existe
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado.');
    }

    // Atualiza workspace
    const updatedWorkspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: workspaceData,
      include: { profile: true },
    });

    // Atualiza ou cria profile se fornecido
    if (profile && Object.keys(profile).length > 0) {
      await this.prisma.professionalProfile.upsert({
        where: { workspaceId },
        update: profile,
        create: {
          workspaceId,
          displayName: profile.displayName || workspace.name,
          phoneE164: profile.phoneE164,
          addressLine: profile.addressLine,
          notes: profile.notes,
        },
      });
    }

    // Retorna workspace atualizado com profile
    return this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { profile: true },
    });
  }

  /**
   * Busca workspace por ID (para painel admin)
   */
  async findById(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        profile: true,
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace não encontrado.');
    }

    return workspace;
  }
}
