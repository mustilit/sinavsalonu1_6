-- İş akışı durum izleri: eksik zaman damgaları eklenir.
-- Strateji:
--  - NOT NULL kolonlar için DEFAULT now() ile geriye dönük doldur (yaklaşık değer;
--    eski satırlarda gerçek değişim zamanı bilinmiyor — kayıp veridir, en iyi tahmin).
--  - Nullable kolonlar (refundedAt, expiredAt, canceledAt) NULL kalır; iş akışı
--    sonraki transition'da setler.
--  - updatedAt'i ek olarak migration anına eşitleyip Prisma @updatedAt ile sonraki
--    update'lerde otomatik güncellenir.

-- ── Purchase ──────────────────────────────────────────────────────────────
ALTER TABLE "purchases"
  ADD COLUMN "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "refundedAt" TIMESTAMP(3),
  ADD COLUMN "expiredAt"  TIMESTAMP(3);

-- ── AdPurchase ───────────────────────────────────────────────────────────
ALTER TABLE "ad_purchases"
  ADD COLUMN "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "canceledAt"      TIMESTAMP(3),
  ADD COLUMN "canceledReason"  TEXT;

-- ── ExamQuestion ─────────────────────────────────────────────────────────
ALTER TABLE "exam_questions"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── ExamOption ───────────────────────────────────────────────────────────
ALTER TABLE "exam_options"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ── Subscription ─────────────────────────────────────────────────────────
ALTER TABLE "subscriptions"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
