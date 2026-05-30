-- Migration: 20260530200000_educator_resubmitted_audit
-- Eğiticinin reddedilmiş başvurusunu profilini güncelleyip yeniden gönderme işlemi
-- için AuditAction enum'a EDUCATOR_RESUBMITTED değeri.

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'EDUCATOR_RESUBMITTED';
