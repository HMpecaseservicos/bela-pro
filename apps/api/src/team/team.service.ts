import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80).optional(),
  role: z.enum(['OWNER', 'STAFF']).default('STAFF'),
});

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'STAFF']).optional(),
  isActive: z.boolean().optional(),
});

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getTeamMembers(workspaceId: string) {
    const members = await this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { createdAt: 'asc' },
      ],
    });

    return members.map(m => ({
      id: m.id,
      userId: m.userId,
      role: m.role,
      isActive: m.isActive,
      createdAt: m.createdAt,
      user: m.user,
    }));
  }

  async inviteMember(workspaceId: string, requesterId: string, input: unknown) {
    const data = inviteSchema.parse(input);
    const email = data.email.trim().toLowerCase();

    // Check if requester is OWNER
    const requesterMembership = await this.prisma.membership.findFirst({
      where: { workspaceId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || requesterMembership.role !== 'OWNER') {
      throw new ForbiddenException('Apenas proprietários podem convidar membros');
    }

    // Check if user already exists AND is already a member
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      const existingMembership = await this.prisma.membership.findFirst({
        where: { workspaceId, userId: existingUser.id },
      });

      if (existingMembership?.isActive) {
        throw new BadRequestException('Este usuário já é membro da equipe');
      }
    }

    // Invalidate any existing pending invites for this email/workspace
    await this.prisma.inviteToken.updateMany({
      where: { workspaceId, email, usedAt: null },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    // Generate unique token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite token
    const invite = await this.prisma.inviteToken.create({
      data: {
        workspaceId,
        token,
        email,
        name: data.name || email.split('@')[0], // Use email prefix as default name
        role: data.role,
        invitedById: requesterId,
        expiresAt,
      },
      include: {
        workspace: { select: { name: true, slug: true } },
      },
    });

    // Build invite URL
    const baseUrl = this.config.get<string>('WEB_URL') || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/convite/${token}`;

    // TODO: Send invitation email with inviteUrl

    return {
      success: true,
      message: `Convite enviado para ${email}`,
      inviteUrl, // For testing purposes - remove in production
      expiresAt: invite.expiresAt,
    };
  }

  async updateMember(workspaceId: string, requesterId: string, membershipId: string, input: unknown) {
    const data = updateMemberSchema.parse(input);

    // Check if requester is OWNER
    const requesterMembership = await this.prisma.membership.findFirst({
      where: { workspaceId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || requesterMembership.role !== 'OWNER') {
      throw new ForbiddenException('Apenas proprietários podem alterar membros');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Prevent removing the last OWNER
    if (data.role === 'STAFF' || data.isActive === false) {
      if (membership.role === 'OWNER') {
        const ownerCount = await this.prisma.membership.count({
          where: { workspaceId, role: 'OWNER', isActive: true },
        });
        if (ownerCount <= 1) {
          throw new BadRequestException('Não é possível remover o único proprietário');
        }
      }
    }

    // TENANT ISOLATION: updateMany com workspaceId no where
    const result = await this.prisma.membership.updateMany({
      where: { id: membershipId, workspaceId },
      data: {
        role: data.role,
        isActive: data.isActive,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Retorna o membro atualizado
    const updated = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  async removeMember(workspaceId: string, requesterId: string, membershipId: string) {
    // Check if requester is OWNER
    const requesterMembership = await this.prisma.membership.findFirst({
      where: { workspaceId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || requesterMembership.role !== 'OWNER') {
      throw new ForbiddenException('Apenas proprietários podem remover membros');
    }

    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, workspaceId },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado');
    }

    // Prevent self-removal
    if (membership.userId === requesterId) {
      throw new BadRequestException('Você não pode remover a si mesmo');
    }

    // Prevent removing the last OWNER
    if (membership.role === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { workspaceId, role: 'OWNER', isActive: true },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException('Não é possível remover o único proprietário');
      }
    }

    // TENANT ISOLATION: updateMany com workspaceId no where (soft delete)
    const result = await this.prisma.membership.updateMany({
      where: { id: membershipId, workspaceId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new NotFoundException('Membro não encontrado');
    }

    return { success: true, message: 'Membro removido da equipe' };
  }

  async getPendingInvites(workspaceId: string) {
    const invites = await this.prisma.inviteToken.findMany({
      where: {
        workspaceId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map(i => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  }

  async cancelInvite(workspaceId: string, requesterId: string, inviteId: string) {
    // Check if requester is OWNER
    const requesterMembership = await this.prisma.membership.findFirst({
      where: { workspaceId, userId: requesterId, isActive: true },
    });

    if (!requesterMembership || requesterMembership.role !== 'OWNER') {
      throw new ForbiddenException('Apenas proprietários podem cancelar convites');
    }

    const invite = await this.prisma.inviteToken.findFirst({
      where: { id: inviteId, workspaceId, usedAt: null },
    });

    if (!invite) {
      throw new NotFoundException('Convite não encontrado ou já utilizado');
    }

    await this.prisma.inviteToken.update({
      where: { id: inviteId },
      data: { usedAt: new Date() }, // Mark as used to invalidate
    });

    return { success: true, message: 'Convite cancelado' };
  }
}
