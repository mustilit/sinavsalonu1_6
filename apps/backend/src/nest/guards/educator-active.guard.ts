import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { prisma } from '../../infrastructure/database/prisma';

/**
 * REJECTED durumdaki eğiticiler içerik (test/paket/canlı oturum/reklam/indirim kodu)
 * üretemez. Yalnızca profil düzenleme + yeniden başvuru yapabilirler. Bu guard
 * `@UseGuards(JwtAuthGuard, RolesGuard, EducatorActiveGuard)` zincirinde son halka
 * olarak kullanılır.
 *
 * Mantık:
 *   - user yoksa → JwtAuthGuard zaten engellerdi; burada yine reddet.
 *   - role !== EDUCATOR → no-op (admin/candidate/worker'a karışmaz).
 *   - role === EDUCATOR ve status === 'REJECTED' → 403.
 *
 * Status DB'den raw SQL ile okunur — Prisma client REJECTED enum'unu görmediği
 * için (Windows EPERM regenerate engeli) `status::text` cast şart.
 */
@Injectable()
export class EducatorActiveGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    // user yoksa: endpoint Public ise zaten geçecek (JwtAuthGuard'ın işi),
    // public değilse JwtAuthGuard 401 fırlatır — burada karışmayalım.
    if (!user) return true;
    const role = String(user.role || '').toUpperCase();
    if (role !== 'EDUCATOR') return true;

    // Hot path için cache: aynı request içinde tekrar sorgulamayalım.
    if (req._educatorStatusChecked) {
      return req._educatorStatusChecked.allowed;
    }

    const rows = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT status::text AS status FROM users WHERE id = ${user.id} LIMIT 1
    `;
    const status = rows[0]?.status ?? null;

    if (status === 'REJECTED') {
      req._educatorStatusChecked = { allowed: false };
      throw new ForbiddenException({
        code: 'EDUCATOR_REJECTED',
        message:
          'Hesabınız reddedildiği için bu işlemi yapamazsınız. Profil ayarlarınızdan eksiklerinizi düzeltip yeniden başvurabilirsiniz.',
      });
    }
    if (status === 'SUSPENDED') {
      req._educatorStatusChecked = { allowed: false };
      throw new ForbiddenException({
        code: 'EDUCATOR_SUSPENDED',
        message: 'Hesabınız askıya alınmış. Yönetici ile iletişime geçin.',
      });
    }

    req._educatorStatusChecked = { allowed: true };
    return true;
  }
}
