import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const signupSchema = z.object({
  workspaceName: z.string().min(2).max(80),
  workspaceSlug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Use apenas a-z, 0-9 e hífen'),
  name: z.string().min(2).max(80),
  email: z.string().email().max(120),
  password: z.string().min(6).max(200),
  phone: z.string().optional().nullable(),
});

const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(2).max(80).optional(),
  password: z.string().min(6).max(200).optional(),
});

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(input: unknown) {
    const data = signupSchema.parse(input);
    const email = data.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('E-mail já cadastrado.');
    }

    const passwordHash = await hash(data.password);

    const created = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.workspaceName,
          slug: data.workspaceSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.name,
          email,
          passwordHash,
        },
      });

      await tx.membership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: 'OWNER',
        },
      });

      await tx.professionalProfile.create({
        data: {
          workspaceId: workspace.id,
          displayName: data.workspaceName,
        },
      });

      return { workspace, user };
    });

    const accessToken = await this.signAccessToken({
      userId: created.user.id,
      workspaceId: created.workspace.id,
      role: 'OWNER',
      isSuperAdmin: false,
    });

    return {
      access_token: accessToken,
      accessToken, // backwards compatibility
      workspace: { id: created.workspace.id, slug: created.workspace.slug, name: created.workspace.name },
      user: { id: created.user.id, name: created.user.name, email: created.user.email },
    };
  }

  async login(input: unknown) {
    const data = loginSchema.parse(input);
    const email = data.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { where: { isActive: true }, orderBy: { createdAt: 'asc' } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const ok = await verify(user.passwordHash, data.password);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    // Super Admin pode logar sem workspace
    if (user.isSuperAdmin) {
      const membership = user.memberships[0];
      const accessToken = await this.signAccessToken({
        userId: user.id,
        workspaceId: membership?.workspaceId ?? null,
        role: membership?.role ?? null,
        isSuperAdmin: true,
      });
      return { accessToken, isSuperAdmin: true };
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException('Usuário sem workspace ativo.');
    }

    const accessToken = await this.signAccessToken({
      userId: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role,
      isSuperAdmin: false,
    });

    return {
      accessToken,
    };
  }

  /**
   * Validates an invite token and returns its info (public, no auth required)
   */
  async getInviteInfo(token: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Este convite já foi utilizado');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou');
    }

    return {
      email: invite.email,
      role: invite.role,
      workspace: invite.workspace,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * Accept an invite token, create user if needed, and create membership
   */
  async acceptInvite(input: unknown) {
    const data = acceptInviteSchema.parse(input);

    const invite = await this.prisma.inviteToken.findUnique({
      where: { token: data.token },
      include: { workspace: true },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado');
    }

    if (invite.usedAt) {
      throw new BadRequestException('Este convite já foi utilizado');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Este convite expirou');
    }

    const email = invite.email.toLowerCase();

    // Check if user already exists
    let existingUser = await this.prisma.user.findUnique({ where: { email } });

    // If user doesn't exist, name and password are required
    if (!existingUser && (!data.name || !data.password)) {
      throw new BadRequestException('Nome e senha são obrigatórios para novos usuários');
    }

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let userId: string;

      if (existingUser) {
        // User exists - just add to workspace, optionally update if data provided
        userId = existingUser.id;
        if (data.password || data.name) {
          const updateData: { passwordHash?: string; name?: string } = {};
          if (data.password) {
            updateData.passwordHash = await hash(data.password);
          }
          if (data.name) {
            updateData.name = data.name;
          }
          await tx.user.update({
            where: { id: userId },
            data: updateData,
          });
        }
      } else {
        // Create new user
        const passwordHash = await hash(data.password!);
        const newUser = await tx.user.create({
          data: {
            name: data.name!,
            email,
            passwordHash,
          },
        });
        userId = newUser.id;
      }

      // Check if membership already exists
      const existingMembership = await tx.membership.findFirst({
        where: { workspaceId: invite.workspaceId, userId },
      });

      if (existingMembership) {
        // Reactivate if inactive
        if (!existingMembership.isActive) {
          await tx.membership.update({
            where: { id: existingMembership.id },
            data: { isActive: true, role: invite.role },
          });
        }
      } else {
        // Create new membership
        await tx.membership.create({
          data: {
            workspaceId: invite.workspaceId,
            userId,
            role: invite.role,
          },
        });
      }

      // Mark invite as used
      await tx.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      });

      return { userId, workspaceId: invite.workspaceId, role: invite.role };
    });

    // Generate access token
    const accessToken = await this.signAccessToken({
      userId: result.userId,
      workspaceId: result.workspaceId,
      role: result.role,
      isSuperAdmin: false,
    });

    return {
      accessToken,
      workspace: { id: invite.workspace.id, slug: invite.workspace.slug, name: invite.workspace.name },
    };
  }

  /**
   * Get all workspaces the user belongs to
   */
  async getUserWorkspaces(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId, isActive: true },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map(m => ({
      workspaceId: m.workspace.id,
      workspaceName: m.workspace.name,
      workspaceSlug: m.workspace.slug,
      role: m.role,
    }));
  }

  /**
   * Switch to a different workspace (generate new token)
   */
  async switchWorkspace(userId: string, input: unknown) {
    const data = switchWorkspaceSchema.parse(input);

    const membership = await this.prisma.membership.findFirst({
      where: { userId, workspaceId: data.workspaceId, isActive: true },
      include: { workspace: { select: { id: true, name: true, slug: true } } },
    });

    if (!membership) {
      throw new NotFoundException('Você não tem acesso a este workspace');
    }

    // Busca se usuário é super admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isSuperAdmin: true },
    });

    const accessToken = await this.signAccessToken({
      userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
      isSuperAdmin: user?.isSuperAdmin ?? false,
    });

    return {
      accessToken,
      workspace: {
        id: membership.workspace.id,
        slug: membership.workspace.slug,
        name: membership.workspace.name,
      },
      role: membership.role,
    };
  }

  /**
   * Get user by ID (for /me endpoint)
   */
  async getUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isSuperAdmin: true },
    });
  }

  private async signAccessToken(payload: { 
    userId: string; 
    workspaceId: string | null; 
    role: 'OWNER' | 'STAFF' | null;
    isSuperAdmin: boolean;
  }) {
    const secret = this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET não configurado');
    }

    const ttl = Number(this.config.get<string>('JWT_ACCESS_TTL_SECONDS') ?? '900');

    return this.jwt.signAsync(
      { workspaceId: payload.workspaceId, role: payload.role, isSuperAdmin: payload.isSuperAdmin },
      { subject: payload.userId, expiresIn: ttl, secret },
    );
  }
}
