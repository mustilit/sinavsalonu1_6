import { prisma } from '../database/prisma';
import { Objection, CreateObjectionInput, ObjectionWithTestOwner } from '../../domain/entities/Objection';
import type { ObjectionStatus } from '../../domain/types';
import { IObjectionRepository } from '../../domain/interfaces/IObjectionRepository';
import { ObjectionStatus as PrismaObjectionStatus } from '@prisma/client';

function toObjection(row: {
  id: string;
  attemptId: string;
  questionId: string;
  reporterId: string;
  reason: string;
  status: string;
  answerText: string | null;
  createdAt: Date;
  answeredAt: Date | null;
  escalatedAt: Date | null;
}): Objection {
  return {
    id: row.id,
    attemptId: row.attemptId,
    questionId: row.questionId,
    reporterId: row.reporterId,
    reason: row.reason,
    status: row.status as ObjectionStatus,
    answerText: row.answerText ?? undefined,
    createdAt: row.createdAt,
    answeredAt: row.answeredAt ?? undefined,
    escalatedAt: row.escalatedAt ?? undefined,
  };
}

export class PrismaObjectionRepository implements IObjectionRepository {
  async create(input: CreateObjectionInput): Promise<Objection> {
    const row = await prisma.objection.create({
      data: {
        attemptId: input.attemptId,
        questionId: input.questionId,
        reporterId: input.reporterId,
        reason: input.reason,
      },
    });
    return toObjection(row);
  }

  async findByAttemptAndQuestion(attemptId: string, questionId: string): Promise<Objection | null> {
    const row = await prisma.objection.findFirst({
      where: { attemptId, questionId },
    });
    if (!row) return null;
    return toObjection(row);
  }

  async findByIdWithTestOwner(objectionId: string): Promise<ObjectionWithTestOwner | null> {
    const row = await prisma.objection.findUnique({
      where: { id: objectionId },
      include: {
        attempt: { select: { test: { select: { educatorId: true } } } },
        question: { select: { test: { select: { educatorId: true } } } },
      },
    });
    if (!row) return null;
    const educatorId =
      (row.attempt as { test?: { educatorId: string | null } })?.test?.educatorId ??
      (row.question as { test?: { educatorId: string | null } })?.test?.educatorId ??
      null;
    return {
      objection: toObjection(row),
      educatorId,
    };
  }

  async updateAnswer(
    objectionId: string,
    data: { answerText: string; answeredAt: Date; status: 'ANSWERED' },
  ): Promise<Objection | null> {
    const row = await prisma.objection.updateMany({
      where: { id: objectionId },
      data: {
        answerText: data.answerText,
        answeredAt: data.answeredAt,
        status: 'ANSWERED',
      },
    });
    if (row.count === 0) return null;
    const updated = await prisma.objection.findUnique({ where: { id: objectionId } });
    return updated ? toObjection(updated) : null;
  }

  async escalate(
    objectionId: string,
    data: { status: 'ESCALATED'; escalatedAt: Date },
  ): Promise<Objection | null> {
    const row = await prisma.objection.updateMany({
      where: { id: objectionId },
      data: {
        status: 'ESCALATED',
        escalatedAt: data.escalatedAt,
      },
    });
    if (row.count === 0) return null;
    const updated = await prisma.objection.findUnique({ where: { id: objectionId } });
    return updated ? toObjection(updated) : null;
  }

  async listEscalated(filters?: { from?: Date; to?: Date }): Promise<Objection[]> {
    const where: { status: PrismaObjectionStatus; createdAt?: { gte?: Date; lte?: Date } } = { status: 'ESCALATED' };
    if (filters?.from != null || filters?.to != null) {
      where.createdAt = {};
      if (filters.from != null) where.createdAt.gte = filters.from;
      if (filters.to != null) where.createdAt.lte = filters.to;
    }
    const rows = await prisma.objection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toObjection);
  }

  async countByTestAndCandidate(testId: string, candidateId: string): Promise<number> {
    const count = await prisma.objection.count({
      where: {
        attempt: { testId },
        reporterId: candidateId,
      },
    });
    return count;
  }

  async findOverdueOpenObjections(olderThanDays: number, limit = 100): Promise<Objection[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const rows = await prisma.objection.findMany({
      where: {
        status: 'OPEN',
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(toObjection);
  }

  async markEscalated(objectionIds: string[]): Promise<number> {
    if (objectionIds.length === 0) return 0;
    const now = new Date();
    const result = await prisma.objection.updateMany({
      where: { id: { in: objectionIds } },
      data: { status: 'ESCALATED', escalatedAt: now },
    });
    return result.count;
  }
}
