# Dal - Kod İnceleme ve Öneriler

Kod incelemesi ve otomatik öneri sunan, Clean Architecture prensiplerine uygun bir API projesi.

## Mimari

```
dal/
├── apps/
│   ├── backend/          # Express backend (TypeScript, Prisma)
│   └── frontend/         # Vite + React frontend
│
├── infra/
│   └── docker/           # Dockerfiles ve docker-compose
│       ├── backend.Dockerfile
│       ├── frontend.Dockerfile
│       └── docker-compose.yml
│
├── .env.example
└── README.md
```

## Kurulum

```bash
cd dal
npm install
```

## Çalıştırma (lokal)

```bash
# Geliştirme (hot reload)
npm run dev

# Production build
npm run build
npm start
```

## Docker ile çalıştırma

Docker komutlarını her zaman `infra/docker` klasörü içinde çalıştırın:

```bash
cd infra/docker

# İmajları build et
docker compose build

# Tüm stack'i ayağa kaldır
docker compose up -d

# Loglar
docker compose logs -f backend

# Temizlik
docker compose down -v
```

Backend health kontrolü:

```bash
curl http://127.0.0.1:3000/health
```

Frontend (Docker): `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/reviews` | Kod analizi yap |
| GET | `/api/reviews` | Tüm incelemeleri listele |
| GET | `/api/reviews/:id` | Tek inceleme getir |
| GET | `/health` | Sağlık kontrolü |

### Örnek İstek

```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet": "function test() { console.log(\"hello\"); }", "language": "javascript"}'
```

## Genişletme

- **Veritabanı**: `ICodeReviewRepository` implement ederek PostgreSQL/MongoDB ekleyebilirsiniz
- **AI Analiz**: `ICodeAnalyzer` implement ederek OpenAI/Claude API entegrasyonu yapabilirsiniz
- **Frontend**: React/Vue ile ayrı bir UI projesi eklenebilir

## Lisans

MIT
