import { spawn } from 'child_process';
import { createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { URL } from 'url';
import { prisma } from '../../../infrastructure/database/prisma';
import { SendEmailUseCase } from '../../use-cases/email/SendEmailUseCase';
import { getDefaultTenantId } from '../../../common/tenant';

type RunResult = {
  logId: string;
  success: boolean;
  fileName?: string;
  sizeBytes?: number;
  durationMs: number;
  error?: string;
};

const FILE_PREFIX = 'sinav-salonu';

const parseDbUrl = (url: string) => {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
};

const formatStamp = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
};

/**
 * pg_dump → gzip yedekleme akışı + retention + admin failure maili.
 *
 * pg_dump host PATH'inde olmalı (Docker imajında `postgresql-client` paketi).
 * DATABASE_URL'den bağlantı bilgileri okunur; şifre PGPASSWORD env üzerinden
 * iletilir (komut satırından sızmasın).
 */
export class BackupService {
  constructor(
    private readonly sendEmail: SendEmailUseCase = new SendEmailUseCase(),
  ) {}

  /**
   * Tek bir yedek alır. AdminSettings okur; backupEnabled=false ve trigger=MANUAL
   * değilse hata fırlatır (cron yanlışlıkla devre dışıyken çalıştıysa korunur).
   */
  async run(opts: { trigger: 'SCHEDULED' | 'MANUAL'; actorId?: string | null }): Promise<RunResult> {
    const tenantId = getDefaultTenantId();
    const startedAt = new Date();

    const settings = await prisma.adminSettings.findUnique({ where: { id: 1 } });
    if (!settings) {
      throw new Error('AdminSettings bulunamadı — yedekleme yapılamıyor');
    }
    if (opts.trigger === 'SCHEDULED' && !settings.backupEnabled) {
      throw new Error('Yedekleme kapalıyken cron tetiklendi — atlanıyor');
    }
    const targetDir = settings.backupTargetDir?.trim();
    if (!targetDir) {
      throw new Error('AdminSettings.backupTargetDir tanımlı değil');
    }

    await fs.mkdir(targetDir, { recursive: true });

    const fileName = `${FILE_PREFIX}-${tenantId}-${formatStamp(startedAt)}.sql.gz`;
    const targetPath = join(targetDir, fileName);

    const log = await prisma.backupLog.create({
      data: {
        tenantId,
        trigger: opts.trigger,
        status: 'RUNNING',
        startedAt,
        targetPath,
        fileName,
        actorId: opts.actorId ?? null,
      },
    });

    try {
      const sizeBytes = await this.dumpAndCompress(targetPath);
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      await prisma.backupLog.update({
        where: { id: log.id },
        data: {
          status: 'SUCCESS',
          finishedAt,
          durationMs,
          sizeBytes: BigInt(sizeBytes),
        },
      });

      await this.pruneOld(targetDir, tenantId, settings.backupRetentionDays);

      await prisma.auditLog.create({
        data: {
          tenantId,
          action: 'BACKUP_RUN',
          entityType: 'BackupLog',
          entityId: log.id,
          actorId: opts.actorId ?? null,
          metadata: {
            trigger: opts.trigger,
            status: 'SUCCESS',
            fileName,
            sizeBytes,
            durationMs,
          },
        },
      });

      return { logId: log.id, success: true, fileName, sizeBytes, durationMs };
    } catch (err: any) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const message = err?.message || String(err);
      const stack = err?.stack || null;

      await prisma.backupLog.update({
        where: { id: log.id },
        data: {
          status: 'FAILED',
          finishedAt,
          durationMs,
          errorMessage: message.slice(0, 2000),
          errorStack: stack ? String(stack).slice(0, 4000) : null,
        },
      });

      // Bozuk dosyayı temizle
      await fs.unlink(targetPath).catch(() => {});

      await prisma.auditLog
        .create({
          data: {
            tenantId,
            action: 'BACKUP_RUN',
            entityType: 'BackupLog',
            entityId: log.id,
            actorId: opts.actorId ?? null,
            metadata: { trigger: opts.trigger, status: 'FAILED', error: message, durationMs },
          },
        })
        .catch(() => {});

      await this.notifyAdminsOfFailure(tenantId, targetPath, message, startedAt).catch(() => {});

      return { logId: log.id, success: false, durationMs, error: message };
    }
  }

  private dumpAndCompress(targetPath: string): Promise<number> {
    const { host, port, user, password, database } = parseDbUrl(
      process.env.DATABASE_URL || '',
    );
    if (!database) throw new Error('DATABASE_URL parse edilemedi');

    return new Promise((resolve, reject) => {
      const dump = spawn(
        'pg_dump',
        ['--no-owner', '--no-privileges', '--clean', '--if-exists', '-h', host, '-p', port, '-U', user, database],
        { env: { ...process.env, PGPASSWORD: password } },
      );
      const gzip = spawn('gzip', ['-c']);
      const out = createWriteStream(targetPath);

      let bytes = 0;
      let dumpStderr = '';
      let gzipStderr = '';

      dump.stderr.on('data', (c) => (dumpStderr += c.toString()));
      gzip.stderr.on('data', (c) => (gzipStderr += c.toString()));

      dump.stdout.pipe(gzip.stdin);
      gzip.stdout.on('data', (c) => (bytes += c.length));
      gzip.stdout.pipe(out);

      let dumpExit: number | null = null;
      let gzipExit: number | null = null;

      const settle = () => {
        if (dumpExit === null || gzipExit === null) return;
        if (dumpExit !== 0) {
          reject(new Error(`pg_dump exit ${dumpExit}: ${dumpStderr.slice(0, 500)}`));
          return;
        }
        if (gzipExit !== 0) {
          reject(new Error(`gzip exit ${gzipExit}: ${gzipStderr.slice(0, 500)}`));
          return;
        }
        // out close de bekleyelim ki dosya tam yazılmış olsun
        out.on('close', () => resolve(bytes));
        out.end();
      };

      dump.on('error', (e) => reject(new Error(`pg_dump spawn: ${e.message}`)));
      gzip.on('error', (e) => reject(new Error(`gzip spawn: ${e.message}`)));
      out.on('error', (e) => reject(new Error(`write stream: ${e.message}`)));

      dump.on('close', (code) => {
        dumpExit = code;
        // pg_dump bittiğinde gzip stdin'i kapat
        gzip.stdin.end();
        settle();
      });
      gzip.on('close', (code) => {
        gzipExit = code;
        settle();
      });
    });
  }

  private async pruneOld(dir: string, tenantId: string, retentionDays: number) {
    if (retentionDays <= 0) return;
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const entries = await fs.readdir(dir).catch(() => [] as string[]);
    const prefix = `${FILE_PREFIX}-${tenantId}-`;

    await Promise.all(
      entries
        .filter((name) => name.startsWith(prefix) && name.endsWith('.sql.gz'))
        .map(async (name) => {
          const p = join(dir, name);
          try {
            const stat = await fs.stat(p);
            if (stat.mtimeMs < cutoff) await fs.unlink(p);
          } catch {
            // dosya silinmiş olabilir — yoksay
          }
        }),
    );
  }

  private async notifyAdminsOfFailure(
    tenantId: string,
    targetPath: string,
    error: string,
    scheduledAt: Date,
  ) {
    const admins = await prisma.user.findMany({
      where: { tenantId, role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true, email: true },
      take: 20,
    });

    await Promise.all(
      admins.map((a) =>
        this.sendEmail
          .execute({
            tenantId,
            templateKey: 'backup-failure-alert',
            to: { userId: a.id, email: a.email, role: 'ADMIN' },
            data: {
              targetPath,
              error: error.slice(0, 500),
              scheduledAt: scheduledAt.toISOString(),
            },
            bypassPreferences: true,
          })
          .catch(() => null),
      ),
    );
  }
}
