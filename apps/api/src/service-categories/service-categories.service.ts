import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  iconEmoji: z.string().max(10).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  categoryType: z.enum(['SERVICE', 'PRODUCT']).optional(), // LOJA UNIFICADA
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  iconEmoji: z.string().max(10).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  categoryType: z.enum(['SERVICE', 'PRODUCT']).optional(), // LOJA UNIFICADA
});

const reorderSchema = z.object({
  categoryIds: z.array(z.string().min(1)).min(1),
});

@Injectable()
export class ServiceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, input: unknown) {
    const data = createCategorySchema.parse(input);

    // Verifica nome duplicado no workspace
    const existing = await this.prisma.serviceCategory.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma categoria com este nome.');
    }

    // Calcula próximo sortOrder se não fornecido
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const lastCategory = await this.prisma.serviceCategory.findFirst({
        where: { workspaceId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (lastCategory?.sortOrder ?? -1) + 1;
    }

    return this.prisma.serviceCategory.create({
      data: {
        ...data,
        workspaceId,
        sortOrder,
      },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }

  async findAll(workspaceId: string, includeInactive = false) {
    return this.prisma.serviceCategory.findMany({
      where: {
        workspaceId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { services: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(workspaceId: string, id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, workspaceId },
      include: {
        _count: {
          select: { services: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return category;
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateCategorySchema.parse(input);

    // Verifica se existe
    await this.findOne(workspaceId, id);

    // Verifica nome duplicado se estiver atualizando nome
    if (data.name) {
      const existing = await this.prisma.serviceCategory.findFirst({
        where: {
          workspaceId,
          name: data.name,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException('Já existe uma categoria com este nome.');
      }
    }

    return this.prisma.serviceCategory.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    // Verifica se existe
    await this.findOne(workspaceId, id);

    // Remove a categoria (services terão categoryId = null por ON DELETE SET NULL)
    return this.prisma.serviceCategory.delete({
      where: { id },
    });
  }

  async reorder(workspaceId: string, input: unknown) {
    const { categoryIds } = reorderSchema.parse(input);

    // Verifica se todos os IDs pertencem ao workspace
    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        workspaceId,
        id: { in: categoryIds },
      },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('Uma ou mais categorias não foram encontradas.');
    }

    // Atualiza sortOrder em batch
    await this.prisma.$transaction(
      categoryIds.map((id, index) =>
        this.prisma.serviceCategory.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findAll(workspaceId);
  }

  // Método para listar categorias com serviços (usado no booking público)
  async findAllWithServices(workspaceId: string) {
    return this.prisma.serviceCategory.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      include: {
        services: {
          where: {
            isActive: true,
            showInBooking: true,
          },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }
}
