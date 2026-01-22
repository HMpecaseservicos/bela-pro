import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0),
  isActive: z.boolean().optional(),
  showInBooking: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().url().optional().nullable(),
  badgeText: z.string().max(50).optional().nullable(),
  categoryTag: z.string().max(50).optional().nullable(),
});

const updateServiceSchema = createServiceSchema.partial();

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, input: unknown) {
    const data = createServiceSchema.parse(input);

    // Verifica nome duplicado no workspace
    const existing = await this.prisma.service.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe um serviço com este nome.');
    }

    // Calcula próximo sortOrder se não fornecido
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const lastService = await this.prisma.service.findFirst({
        where: { workspaceId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (lastService?.sortOrder ?? -1) + 1;
    }

    return this.prisma.service.create({
      data: {
        ...data,
        workspaceId,
        isActive: data.isActive ?? true,
        showInBooking: data.showInBooking ?? true,
        sortOrder,
      },
    });
  }

  async findAll(workspaceId: string, isActive?: boolean) {
    return this.prisma.service.findMany({
      where: {
        workspaceId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(workspaceId: string, id: string) {
    // TENANT ISOLATION: findFirst com workspaceId no where
    const service = await this.prisma.service.findFirst({
      where: { id, workspaceId },
    });

    if (!service) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return service;
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateServiceSchema.parse(input);

    // Verifica se serviço existe e pertence ao workspace
    const service = await this.findOne(workspaceId, id);

    // Se está alterando nome, verifica duplicação
    if (data.name && data.name !== service.name) {
      const existing = await this.prisma.service.findUnique({
        where: {
          workspaceId_name: {
            workspaceId,
            name: data.name,
          },
        },
      });

      if (existing) {
        throw new BadRequestException('Já existe um serviço com este nome.');
      }
    }

    // TENANT ISOLATION: update com workspaceId no where
    const result = await this.prisma.service.updateMany({
      where: { id, workspaceId },
      data,
    });

    if (result.count === 0) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return this.findOne(workspaceId, id);
  }

  async delete(workspaceId: string, id: string) {
    // TENANT ISOLATION: delete com workspaceId no where
    const result = await this.prisma.service.deleteMany({
      where: { id, workspaceId },
    });

    if (result.count === 0) {
      throw new NotFoundException('Serviço não encontrado.');
    }

    return { success: true };
  }
}
