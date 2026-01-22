import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const updateClientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phoneE164: z.string().min(8).max(20).optional(),
  email: z.string().email().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(workspaceId: string) {
    return this.prisma.client.findMany({
      where: { workspaceId },
      include: {
        appointments: {
          select: {
            id: true,
            startAt: true,
            status: true,
            services: {
              include: {
                service: { select: { name: true } },
              },
            },
          },
          orderBy: { startAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(workspaceId: string, id: string) {
    // TENANT ISOLATION: findFirst com workspaceId no where
    const client = await this.prisma.client.findFirst({
      where: { id, workspaceId },
      include: {
        appointments: {
          select: {
            id: true,
            startAt: true,
            status: true,
            services: {
              include: {
                service: { select: { name: true } },
              },
            },
          },
          orderBy: { startAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return client;
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateClientSchema.parse(input);

    // TENANT ISOLATION: findFirst com workspaceId no where
    const client = await this.prisma.client.findFirst({
      where: { id, workspaceId },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Se está alterando telefone, verifica duplicação
    if (data.phoneE164 && data.phoneE164 !== client.phoneE164) {
      const existing = await this.prisma.client.findUnique({
        where: {
          workspaceId_phoneE164: {
            workspaceId,
            phoneE164: data.phoneE164,
          },
        },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Já existe um cliente com este telefone.');
      }
    }

    // TENANT ISOLATION: update com workspaceId no where
    const result = await this.prisma.client.updateMany({
      where: { id, workspaceId },
      data: {
        name: data.name,
        phoneE164: data.phoneE164,
        notesInternal: data.notes,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    return this.findOne(workspaceId, id);
  }

  async delete(workspaceId: string, id: string) {
    // Verifica se cliente existe e pertence ao workspace
    const client = await this.prisma.client.findFirst({
      where: { id, workspaceId },
      include: { appointments: { select: { id: true } } },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }

    // Verifica se tem agendamentos (não permite excluir)
    if (client.appointments.length > 0) {
      throw new BadRequestException(
        `Não é possível excluir este cliente pois ele possui ${client.appointments.length} agendamento(s). Exclua os agendamentos primeiro.`
      );
    }

    // TENANT ISOLATION: delete com workspaceId no where
    await this.prisma.client.deleteMany({
      where: { id, workspaceId },
    });

    return { success: true };
  }
}
