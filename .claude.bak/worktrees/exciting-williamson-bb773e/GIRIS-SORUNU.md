# "Sunucuya ulaşılamadı" – Giriş yapamıyorum

Bu mesaj, **backend (port 3000)** tarayıcıdan erişilemediği için çıkıyor. Giriş yapabilmek için backend’in çalışıyor olması gerekir.

## En hızlı çözüm: Tüm stack’i Docker ile başlat

1. **Docker Desktop**’ın açık ve çalıştığından emin olun.
2. Şu dosyaya **çift tıklayın** veya terminalde çalıştırın:
   ```
   infra\docker\start-stack.cmd
   ```
3. Script postgres, backend, redis ve frontend’i başlatır. 8–10 saniye bekleyin.
4. Tarayıcıda **http://localhost:5173** açın.
5. **Giriş Yap** → aday@demo.com veya educator@demo.com, şifre: **demo123**.

---

## Manuel: Docker Compose

```bash
cd c:\Users\mtulu\dal\infra\docker
docker compose up -d
```

Birkaç saniye sonra:
- Backend: http://localhost:3000/health (açılıyorsa backend ayakta)
- Frontend: http://localhost:5173

---

## Sadece frontend çalışıyorsa

Frontend’i `npm run dev` veya Docker’da sadece frontend ile açtıysanız, **backend mutlaka aynı anda çalışmalı**. Backend yoksa tarayıcı “Sunucuya ulaşılamadı” der.

- **Docker kullanın:** Yukarıdaki `start-stack.cmd` veya `docker compose up -d` ile tüm stack’i başlatın.
- **Docker kullanmıyorsanız:** Backend’i kendiniz çalıştırın (PostgreSQL gerekir):
  ```bash
  cd apps\backend
  # .env dosyasında DATABASE_URL olmalı (örn. .env.example'dan kopyalayın)
  npm run start:dev
  ```
  Sonra frontend’i **http://localhost:5174** (Vite dev server) üzerinden açın.

---

## Özet

| Durum                         | Yapılacak                          |
|------------------------------|-------------------------------------|
| Hiçbir şey çalışmıyor        | `infra\docker\start-stack.cmd`     |
| Backend çalışıyor mu emin değilim | Tarayıcıda http://localhost:3000/health açın |
| Docker hata veriyor          | Docker Desktop’ı yeniden başlatın, gerekirse “Restart” / “Reset” deneyin |

Demo hesaplar: **aday@demo.com** | **educator@demo.com** — şifre: **demo123**
