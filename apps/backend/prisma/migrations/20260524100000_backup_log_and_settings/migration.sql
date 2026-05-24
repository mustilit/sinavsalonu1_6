-- Yedekleme: BackupLog modeli ve AdminSettings yedekleme alanları.
-- Cron pg_dump → gzip akışı için audit + scheduler yapılandırması.

-- 1) AdminSettings yedekleme alanları
ALTER TABLE "admin_settings"
  ADD COLUMN "backupEnabled"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "backupCronExpression" TEXT,
  ADD COLUMN "backupTargetDir"      TEXT,
  ADD COLUMN "backupRetentionDays"  INTEGER NOT NULL DEFAULT 2;

-- 2) Yedek log tablosu
CREATE TYPE "BackupStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');
CREATE TYPE "BackupTrigger" AS ENUM ('SCHEDULED', 'MANUAL');

CREATE TABLE "backup_logs" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "trigger"      "BackupTrigger" NOT NULL,
  "status"       "BackupStatus" NOT NULL DEFAULT 'RUNNING',
  "scheduledAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt"    TIMESTAMP(3),
  "finishedAt"   TIMESTAMP(3),
  "durationMs"   INTEGER,
  "sizeBytes"    BIGINT,
  "targetPath"   TEXT,
  "fileName"     TEXT,
  "actorId"      TEXT,
  "errorMessage" TEXT,
  "errorStack"   TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "backup_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "backup_logs_tenant_created_idx"
  ON "backup_logs"("tenantId", "createdAt" DESC);

CREATE INDEX "backup_logs_tenant_status_created_idx"
  ON "backup_logs"("tenantId", "status", "createdAt" DESC);

ALTER TABLE "backup_logs"
  ADD CONSTRAINT "backup_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
