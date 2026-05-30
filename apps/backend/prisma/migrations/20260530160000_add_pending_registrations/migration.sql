-- Migration: 20260530160000_add_pending_registrations
-- Doğrulanmamış kayıt bekleme tablosu.
-- Kullanıcı email doğrulama yapana kadar User tablosuna yazılmaz;
-- PendingRegistration'da bekler. Doğrulama sonrası User'a promote edilir.

CREATE TABLE "pending_registrations" (
    "id"                          TEXT NOT NULL,
    "email"                       TEXT NOT NULL,
    "username"                    TEXT NOT NULL,
    "passwordHash"                TEXT NOT NULL,
    "firstName"                   TEXT,
    "lastName"                    TEXT,
    "role"                        "UserRole" NOT NULL DEFAULT 'CANDIDATE',
    "acceptedTermsContractId"     TEXT,
    "acceptedPrivacyContractId"   TEXT,
    "verificationToken"           TEXT NOT NULL,
    "verificationTokenExpiresAt"  TIMESTAMP(3) NOT NULL,
    "ip"                          TEXT,
    "userAgent"                   TEXT,
    "tenantId"                    TEXT,
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_registrations_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "pending_registrations_email_key" ON "pending_registrations"("email");
CREATE UNIQUE INDEX "pending_registrations_username_key" ON "pending_registrations"("username");
CREATE UNIQUE INDEX "pending_registrations_verificationToken_key" ON "pending_registrations"("verificationToken");

-- TTL cron için index
CREATE INDEX "pending_registrations_verificationTokenExpiresAt_idx" ON "pending_registrations"("verificationTokenExpiresAt");
