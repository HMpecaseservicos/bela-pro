import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { z } from 'zod';

const createTestimonialSchema = z.object({
  clientName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(5).max(500),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateTestimonialSchema = createTestimonialSchema.partial();

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic(workspaceId: string) {
    return this.prisma.testimonial.findMany({
      where: { workspaceId, isActive: true },
      select: {
        id: true,
        clientName: true,
        rating: true,
        text: true,
        sortOrder: true,
        createdAt: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.testimonial.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(workspaceId: string, input: unknown) {
    const data = createTestimonialSchema.parse(input);
    return this.prisma.testimonial.create({
      data: { ...data, workspaceId },
    });
  }

  async update(workspaceId: string, id: string, input: unknown) {
    const data = updateTestimonialSchema.parse(input);
    const existing = await this.prisma.testimonial.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Depoimento não encontrado.');
    return this.prisma.testimonial.update({ where: { id }, data });
  }

  async remove(workspaceId: string, id: string) {
    const existing = await this.prisma.testimonial.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) throw new NotFoundException('Depoimento não encontrado.');
    return this.prisma.testimonial.delete({ where: { id } });
  }
}
