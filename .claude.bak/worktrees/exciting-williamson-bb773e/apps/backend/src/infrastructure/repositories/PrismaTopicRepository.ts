import { Injectable } from '@nestjs/common';
import { prisma } from '../database/prisma';
import { ITopicRepository } from '../../domain/interfaces/ITopicRepository';
import { Topic } from '../../domain/entities/Topic';

@Injectable()
export class PrismaTopicRepository implements ITopicRepository {
  async create(input: { examTypeId: string; name: string; slug: string; active?: boolean }): Promise<Topic> {
    const r = await prisma.topic.create({
      data: {
        examTypeId: input.examTypeId,
        name: input.name,
        slug: input.slug,
        active: input.active ?? true,
      },
    });
    return {
      id: r.id,
      examTypeId: r.examTypeId,
      name: r.name,
      slug: r.slug,
      active: r.active,
      createdAt: r.createdAt,
    };
  }

  async findById(id: string): Promise<Topic | null> {
    const r = await prisma.topic.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id,
      examTypeId: r.examTypeId,
      name: r.name,
      slug: r.slug,
      active: r.active,
      createdAt: r.createdAt,
    };
  }

  async findByExamTypeAndSlug(examTypeId: string, slug: string): Promise<Topic | null> {
    const r = await prisma.topic.findUnique({
      where: { examTypeId_slug: { examTypeId, slug } },
    });
    if (!r) return null;
    return {
      id: r.id,
      examTypeId: r.examTypeId,
      name: r.name,
      slug: r.slug,
      active: r.active,
      createdAt: r.createdAt,
    };
  }

  async listByExamType(examTypeId: string, activeOnly?: boolean): Promise<Topic[]> {
    const where = { examTypeId, ...(activeOnly ? { active: true } : {}) };
    const rows = await prisma.topic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      examTypeId: r.examTypeId,
      name: r.name,
      slug: r.slug,
      active: r.active,
      createdAt: r.createdAt,
    }));
  }

  async update(id: string, data: { name?: string; slug?: string; active?: boolean }): Promise<Topic | null> {
    const clean: Record<string, unknown> = {};
    if (data.name !== undefined) clean.name = data.name;
    if (data.slug !== undefined) clean.slug = data.slug;
    if (data.active !== undefined) clean.active = data.active;
    if (Object.keys(clean).length === 0) return this.findById(id);
    const r = await prisma.topic.updateMany({ where: { id }, data: clean as any });
    if (r.count === 0) return null;
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const r = await prisma.topic.deleteMany({ where: { id } });
    return r.count > 0;
  }
}
