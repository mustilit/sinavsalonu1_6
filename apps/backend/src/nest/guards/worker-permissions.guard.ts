import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { WORKER_PERMISSIONS_KEY } from '../decorators/worker-permissions.decorator';
import { RedisCache } from '../../infrastructure/cache/RedisCache';
import { prisma } from '../../infrastructure/database/prisma';

const WORKER_PAGES_TTL_SECONDS = 60;

const workerPagesCacheKey = (userId: string) => `workerPages:${userId}`;

export const invalidateWorkerPagesCache = async (cache: RedisCache, userId: string) => {
  await cache.del(workerPagesCacheKey(userId));
};

/**
 * @WorkerPermissions('PageName') metadata'sını okur ve WORKER rolündeki
 * kullanıcının bu sayfaya erişim hakkı olup olmadığını WorkerPermission.pages
 * üzerinden doğrular. ADMIN rolü her sayfaya geçer; @WorkerPermissions
 * decorator'ı yoksa guard pas geçer (yalnız @Roles kontrolü uygulanır).
 */
@Injectable()
export class WorkerPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cache: RedisCache,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const cls = context.getClass();

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [handler, cls]);
    if (isPublic) return true;

    const requiredPages = this.reflector.getAllAndOverride<string[]>(WORKER_PERMISSIONS_KEY, [
      handler,
      cls,
    ]);
    if (!requiredPages || requiredPages.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException({ error: 'FORBIDDEN' });

    if (user.role === 'ADMIN') return true;

    if (user.role !== 'WORKER') {
      throw new ForbiddenException({ error: 'WORKER_PAGE_FORBIDDEN' });
    }

    const pages = await this.loadPages(user.id);
    const ok = requiredPages.every((p) => pages.includes(p));
    if (!ok) throw new ForbiddenException({ error: 'WORKER_PAGE_FORBIDDEN' });
    return true;
  }

  private async loadPages(userId: string): Promise<string[]> {
    const key = workerPagesCacheKey(userId);
    const cached = await this.cache.get<string[]>(key);
    if (cached) return cached;

    const permission = await prisma.workerPermission.findUnique({
      where: { userId },
      select: { pages: true },
    });
    const pages = permission?.pages ?? [];
    await this.cache.set(key, pages, WORKER_PAGES_TTL_SECONDS);
    return pages;
  }
}
