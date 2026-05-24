import { Injectable } from '@nestjs/common';
import { prisma } from '../../../infrastructure/database/prisma';
import { getDefaultTenantId } from '../../../common/tenant';

type Params = {
  cursor?: { id: string };
  limit?: number;
  status?: 'RUNNING' | 'SUCCESS' | 'FAILED';
};

@Injectable()
export class ListBackupLogsUseCase {
  async execute({ cursor, limit = 20, status }: Params) {
    const tenantId = getDefaultTenantId();
    const take = Math.min(Math.max(limit, 1), 100) + 1;

    const rows = await prisma.backupLog.findMany({
      where: {
        tenantId,
        ...(status && { status }),
      },
      select: {
        id: true,
        trigger: true,
        status: true,
        scheduledAt: true,
        startedAt: true,
        finishedAt: true,
        durationMs: true,
        sizeBytes: true,
        fileName: true,
        targetPath: true,
        errorMessage: true,
        createdAt: true,
        actor: { select: { id: true, username: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
      ...(cursor && {
        cursor: { id: cursor.id },
        skip: 1,
      }),
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, -1) : rows;
    const last = items[items.length - 1];

    // BigInt → string (JSON serialize için)
    const serialized = items.map((r) => ({
      ...r,
      sizeBytes: r.sizeBytes !== null ? r.sizeBytes.toString() : null,
    }));

    return {
      items: serialized,
      nextCursor: hasMore && last ? { id: last.id } : null,
    };
  }
}
