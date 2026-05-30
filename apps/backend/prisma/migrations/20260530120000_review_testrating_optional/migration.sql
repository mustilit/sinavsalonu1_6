-- Review.testRating opsiyonel hale getirildi.
-- Aday, testi değerlendirmeden SADECE eğiticiyi (educatorRating) puanlayabilsin diye
-- testRating artık nullable. Educator-only review satırları testRating = NULL taşır;
-- test puanı agregasyonları (avg/count) NULL satırları saymaz.
ALTER TABLE "reviews" ALTER COLUMN "testRating" DROP NOT NULL;
