import { prisma } from '../database/prisma';
import { IRefundRepository, RefundRequest, RefundListItem } from '../../domain/interfaces/IRefundRepository';

export class PrismaRefundRepository implements IRefundRepository {
  async create(input: { purchaseId: string; candidateId: string; testId: string; reason?: string }): Promise<RefundRequest> {
    const r = await prisma.refundRequest.create({ data: { purchaseId: input.purchaseId, candidateId: input.candidateId, testId: input.testId, reason: input.reason ?? null } });
    return this.toDomain(r);
  }

  async findByPurchaseId(purchaseId: string): Promise<RefundRequest | null> {
    const r = await prisma.refundRequest.findUnique({ where: { purchaseId } as any });
    return r ? this.toDomain(r) : null;
  }

  async findById(id: string): Promise<RefundRequest | null> {
    const r = await prisma.refundRequest.findUnique({ where: { id } });
    return r ? this.toDomain(r) : null;
  }

  async findByCandidateId(candidateId: string): Promise<RefundListItem[]> {
    const rows = await prisma.refundRequest.findMany({
      where: { candidateId },
      orderBy: { createdAt: 'desc' },
    });
    return this.toListWithTestTitle(rows);
  }

  async findByStatus(status: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<RefundListItem[]> {
    const rows = await prisma.refundRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
    return this.toListWithTestTitle(rows);
  }

  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED', decidedBy: string): Promise<RefundRequest> {
    const r = await prisma.refundRequest.update({ where: { id }, data: { status, decidedBy, decidedAt: new Date() } as any });
    return this.toDomain(r);
  }

  async approve(refundId: string, adminId: string, decidedAt: Date): Promise<RefundRequest> {
    const r = await prisma.refundRequest.update({
      where: { id: refundId },
      data: { status: 'APPROVED', decidedBy: adminId, decidedAt },
    });
    return this.toDomain(r);
  }

  async reject(refundId: string, adminId: string, decidedAt: Date, _reason?: string): Promise<RefundRequest> {
    const r = await prisma.refundRequest.update({
      where: { id: refundId },
      data: { status: 'REJECTED', decidedBy: adminId, decidedAt },
    });
    return this.toDomain(r);
  }

  private toDomain(row: any): RefundRequest {
    return {
      id: row.id,
      purchaseId: row.purchaseId,
      candidateId: row.candidateId,
      testId: row.testId,
      reason: row.reason,
      status: row.status,
      decidedBy: row.decidedBy,
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private async toListWithTestTitle(rows: any[]): Promise<RefundListItem[]> {
    if (rows.length === 0) return [];
    const testIds = [...new Set(rows.map((r) => r.testId))];
    const tests = await prisma.examTest.findMany({
      where: { id: { in: testIds } },
      select: { id: true, title: true },
    });
    const titleByTestId = new Map(tests.map((t) => [t.id, t.title]));
    return rows.map((row) => ({
      ...this.toDomain(row),
      testTitle: titleByTestId.get(row.testId) ?? null,
    }));
  }
}

