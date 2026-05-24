-- LiveOption seçeneklerine görsel desteği ekler.
-- Frontend görsel-only/görsel+metin seçenekler oluşturmaya izin veriyor;
-- önce şemada alan yoktu, payload backend'de düşüyordu. Bu migration sonra
-- DTO + controller + use case'ler de mediaUrl'yi geçirir.
ALTER TABLE "live_options" ADD COLUMN "mediaUrl" TEXT;
