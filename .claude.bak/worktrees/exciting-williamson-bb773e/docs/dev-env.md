## Geliştirme Ortamları

Bu repo iki temel geliştirme modu destekler:

- **Local-run**: Node.js doğrudan host makinede (`npm run dev`, `npm run start`).
- **Docker-run**: Backend ve Postgres Docker Compose içinde çalışır.

### Local-run

- Çalıştırma dizini: `apps/backend`
- `.env` dosyası: `apps/backend/.env` (örnek için `.env.example`'ı kopyalayın)
- `DATABASE_URL` **host makineden** erişilecek şekilde olmalıdır:

  ```env
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sinavsalonu_v2?schema=public
  ```

- Komutlar:
  - `cd apps/backend`
  - `npm install`
  - `npm run dev` veya `npm run start`

### Docker-run

- Çalıştırma dizini: `infra/docker`
- `.env` dosyası: `infra/docker/.env`
- Backend container’ı Postgres’e Docker network üzerinden bağlanır; host adı **`postgres`** olmalıdır:

  ```env
  DATABASE_URL=postgresql://postgres:postgres@postgres:5432/dal?schema=public
  JWT_SECRET=dev-secret
  ```

- Komutlar:
  - `cd infra/docker`
  - `docker compose up -d`

### Özet Kural

- **Host üzerinde** çalışan tüm komutlar için `localhost:5432`.
- **Container içinde** çalışan tüm komutlar için `postgres:5432`.

