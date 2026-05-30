-- Migration: 20260530190000_educator_social_links
-- Eğitici kayıt wizard'ına LinkedIn ve web sitesi (kişisel) bağlantıları ekle.
-- Step 2'de opsiyonel olarak alınır; doğrulama sonrası User.metadata'ya kopyalanır.

ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "pending_registrations" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
