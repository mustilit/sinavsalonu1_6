import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INTERNAL_ONLY_KEY } from '../decorators/internal-only.decorator';

const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

const parseAllowedList = (): { ips: Set<string>; cidrs: string[] } => {
  const raw = (process.env.METRICS_ALLOWED_IPS || '').trim();
  if (!raw) return { ips: new Set(), cidrs: [] };
  const ips = new Set<string>();
  const cidrs: string[] = [];
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (part.includes('/')) cidrs.push(part);
    else ips.add(part);
  }
  return { ips, cidrs };
};

const ipv4ToInt = (ip: string): number | null => {
  const m = ip.match(/^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const [, a, b, c, d] = m;
  const parts = [a, b, c, d].map((x) => Number(x));
  if (parts.some((p) => p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
};

const ipMatchesCidr = (ip: string, cidr: string): boolean => {
  const [base, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  const ipInt = ipv4ToInt(ip);
  const baseInt = ipv4ToInt(base);
  if (ipInt === null || baseInt === null) return false;
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
};

const extractClientIp = (req: any): string => {
  // Trust proxy yapılandırması varsa Express req.ip kullanılabilir.
  // Aksi halde X-Forwarded-For'a güvenmeyiz (spoofing). En güvenli: socket.remoteAddress.
  const sock = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return String(sock).replace(/^::ffff:/, '');
};

/**
 * @InternalOnly() dekoratörlü endpoint'lere yalnızca METRICS_ALLOWED_IPS env'ine
 * tanımlı IP/CIDR'ler veya loopback'ten erişim izni verir. Aksi halde 403.
 */
@Injectable()
export class InternalOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const internal = this.reflector.getAllAndOverride<boolean>(INTERNAL_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!internal) return true;

    const req = context.switchToHttp().getRequest();
    const ip = extractClientIp(req);
    const { ips, cidrs } = parseAllowedList();

    // Boş allowlist → sadece loopback. İlk deploy'da konfigürasyon eksik olursa
    // dışarıdan ulaşılamasın.
    if (LOOPBACK_ADDRESSES.has(ip) || LOOPBACK_ADDRESSES.has(`::ffff:${ip}`)) return true;

    if (ips.has(ip)) return true;
    if (cidrs.some((c) => ipMatchesCidr(ip, c))) return true;

    throw new ForbiddenException({ error: 'INTERNAL_ONLY_FORBIDDEN' });
  }
}
