import { Injectable, Logger, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { hash, verify } from '@node-rs/argon2';
import { z } from 'zod';

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
  ctaLabel: z.string().max(60).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable(),
  logoLightUrl: z.string().optional().nullable(),
  logoDarkUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
});

const createPostSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  ctaLabel: z.string().max(60).optional().nullable(),
  ctaUrl: z.string().url().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updatePostSchema = createPostSchema.partial().extend({
  isActive: z.boolean().optional(),
});

@Injectable()
export class SponsorDashboardService {
  private readonly logger = new Logger(SponsorDashboardService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ===========================================================================
  // AUTH
  // ===========================================================================

  async login(raw: unknown) {
    const data = loginSchema.parse(raw);
    const email = data.email.trim().toLowerCase();

    const sponsor = await this.prisma.sponsor.findUnique({ where: { email } });

    if (!sponsor || !sponsor.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (sponsor.tier !== 'DIAMOND') {
      throw new UnauthorizedException('Acesso exclusivo para patrocinadores Diamond');
    }

    if (!sponsor.isActive) {
      throw new UnauthorizedException('Conta desativada. Entre em contato com o suporte.');
    }

    const ok = await verify(sponsor.passwordHash, data.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = await this.signSponsorToken(sponsor.id, sponsor.tier);

    return {
      accessToken,
      sponsor: {
        id: sponsor.id,
        name: sponsor.name,
        tier: sponsor.tier,
        logoLightUrl: sponsor.logoLightUrl,
      },
    };
  }

  async setupPassword(sponsorId: string, password: string) {
    const passwordHash = await hash(password);
    await this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { passwordHash },
    });
  }

  // ===========================================================================
  // PROFILE
  // ===========================================================================

  async getProfile(sponsorId: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id: sponsorId },
      include: {
        posts: {
          where: { isActive: true },
          orderBy: { publishedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return {
      id: sponsor.id,
      name: sponsor.name,
      slug: sponsor.slug,
      description: sponsor.description,
      logoLightUrl: sponsor.logoLightUrl,
      logoDarkUrl: sponsor.logoDarkUrl,
      coverImageUrl: sponsor.coverImageUrl,
      websiteUrl: sponsor.websiteUrl,
      ctaLabel: sponsor.ctaLabel,
      ctaUrl: sponsor.ctaUrl,
      tier: sponsor.tier,
      sponsorType: sponsor.sponsorType,
      email: sponsor.email,
      contractStartsAt: sponsor.contractStartsAt,
      contractEndsAt: sponsor.contractEndsAt,
      recentPosts: sponsor.posts,
    };
  }

  async updateProfile(sponsorId: string, raw: unknown) {
    const data = updateProfileSchema.parse(raw);

    const sponsor = await this.prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data,
    });
  }

  // ===========================================================================
  // STATS / ANALYTICS
  // ===========================================================================

  async getStats(sponsorId: string) {
    const sponsor = await this.prisma.sponsor.findUnique({
      where: { id: sponsorId },
      select: {
        viewCount: true,
        clickCount: true,
        lastViewedAt: true,
        lastClickedAt: true,
        contractStartsAt: true,
        contractEndsAt: true,
        tier: true,
        name: true,
      },
    });

    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');

    // Post stats
    const posts = await this.prisma.sponsorPost.findMany({
      where: { sponsorId },
      select: {
        viewCount: true,
        clickCount: true,
        isActive: true,
      },
    });

    const totalPostViews = posts.reduce((sum, p) => sum + p.viewCount, 0);
    const totalPostClicks = posts.reduce((sum, p) => sum + p.clickCount, 0);
    const activePosts = posts.filter(p => p.isActive).length;
    const totalPosts = posts.length;

    const ctr = sponsor.viewCount > 0
      ? ((sponsor.clickCount / sponsor.viewCount) * 100).toFixed(1)
      : '0';

    const postCtr = totalPostViews > 0
      ? ((totalPostClicks / totalPostViews) * 100).toFixed(1)
      : '0';

    // Contract status
    const now = new Date();
    const contractActive = !sponsor.contractEndsAt || new Date(sponsor.contractEndsAt) >= now;
    const contractDaysLeft = sponsor.contractEndsAt
      ? Math.max(0, Math.ceil((new Date(sponsor.contractEndsAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      brand: {
        views: sponsor.viewCount,
        clicks: sponsor.clickCount,
        ctr: Number(ctr),
        lastViewedAt: sponsor.lastViewedAt,
        lastClickedAt: sponsor.lastClickedAt,
      },
      posts: {
        total: totalPosts,
        active: activePosts,
        views: totalPostViews,
        clicks: totalPostClicks,
        ctr: Number(postCtr),
      },
      contract: {
        active: contractActive,
        daysLeft: contractDaysLeft,
        startsAt: sponsor.contractStartsAt,
        endsAt: sponsor.contractEndsAt,
      },
    };
  }

  // ===========================================================================
  // POSTS (Content Management)
  // ===========================================================================

  async getPosts(sponsorId: string) {
    return this.prisma.sponsorPost.findMany({
      where: { sponsorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPost(sponsorId: string, raw: unknown) {
    const data = createPostSchema.parse(raw);

    return this.prisma.sponsorPost.create({
      data: {
        sponsorId,
        title: data.title,
        description: data.description,
        imageUrl: data.imageUrl,
        ctaLabel: data.ctaLabel,
        ctaUrl: data.ctaUrl,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async updatePost(sponsorId: string, postId: string, raw: unknown) {
    const data = updatePostSchema.parse(raw);

    const post = await this.prisma.sponsorPost.findFirst({
      where: { id: postId, sponsorId },
    });
    if (!post) throw new NotFoundException('Postagem não encontrada');

    const updateData: Record<string, unknown> = { ...data };
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    return this.prisma.sponsorPost.update({
      where: { id: postId },
      data: updateData,
    });
  }

  async deletePost(sponsorId: string, postId: string) {
    const post = await this.prisma.sponsorPost.findFirst({
      where: { id: postId, sponsorId },
    });
    if (!post) throw new NotFoundException('Postagem não encontrada');

    return this.prisma.sponsorPost.delete({ where: { id: postId } });
  }

  // ===========================================================================
  // ADMIN: Setup sponsor access (called by admin)
  // ===========================================================================

  async adminSetupSponsorAccess(sponsorId: string, email: string, password: string) {
    const sponsor = await this.prisma.sponsor.findUnique({ where: { id: sponsorId } });
    if (!sponsor) throw new NotFoundException('Patrocinador não encontrado');
    if (sponsor.tier !== 'DIAMOND') {
      throw new BadRequestException('Acesso ao painel é exclusivo para tier Diamond');
    }

    // Check email uniqueness
    const existing = await this.prisma.sponsor.findUnique({ where: { email } });
    if (existing && existing.id !== sponsorId) {
      throw new BadRequestException('Email já está em uso por outro patrocinador');
    }

    const passwordHash = await hash(password);

    return this.prisma.sponsor.update({
      where: { id: sponsorId },
      data: { email, passwordHash },
    });
  }

  // ===========================================================================
  // PRIVATE
  // ===========================================================================

  private async signSponsorToken(sponsorId: string, tier: string) {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET não configurado');

    const ttl = Number(this.config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '86400'); // 24h for sponsors

    return this.jwt.signAsync(
      { tier, isSponsor: true },
      { subject: sponsorId, expiresIn: ttl, secret },
    );
  }
}
