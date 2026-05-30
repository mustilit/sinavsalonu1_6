-- Migration: 20260530170000_educator_rejection
-- Eğitici başvurusu reddetme akışı:
--   - UserStatus enum'a REJECTED değeri
--   - AuditAction enum'a EDUCATOR_REJECTED değeri
--   - users tablosuna rejectionReason (text) + rejectedAt (timestamp) kolonları

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EDUCATOR_REJECTED';

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
