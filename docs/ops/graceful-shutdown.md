# Graceful Shutdown Runbook

> **Statü:** Sprint 10 — Production sertifikasyonu
> **İlgili kod:** `apps/backend/src/nest/main.ts`, `nest/services/graceful-shutdown.service.ts`

## Problem

K8s pod restart (rolling deploy, autoscale, eviction) sırasında SIGTERM
gelir. Default NestJS davranışı: hemen `process.exit(0)` — şu sorunları
yaratır:

1. **Active HTTP request'ler yarıda kalır** — kullanıcı 502 görür
2. **BullMQ job'lar orphan** — kuyrukta kalır ama proceeding değil
3. **Prisma connection pool agresif kapanır** — DB'de orphan transaction
4. **Sentry pending event'leri gönderilemez** — debug verisi kayıp
5. **Redis connection pool yarıda kapanır** — komut timeout'u

## Çözüm

### NestJS Lifecycle Hook'ları

`main.ts`:
```typescript
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
```

Bu komut:
- SIGTERM/SIGINT/SIGHUP'ı yakalar
- Provider'ların `onModuleDestroy` + `onApplicationShutdown` metodlarını çağırır
- HTTP server yeni connection kabul etmeyi durdurur, in-flight'leri bekler

### GracefulShutdownService

`nest/services/graceful-shutdown.service.ts` cross-cutting cleanup yapar:

1. **Prisma** — `$disconnect()` (max 5s timeout)
2. **Redis** — `quit()` (max 3s timeout, FAIL-OPEN if missing)
3. **Sentry** — `flush(2000)` pending event'leri gönder
4. **Log** — shutdown duration + reason

Her adım Promise.race ile timeout korumalı; tek bir hang tüm shutdown'ı tutmaz.

### K8s Pod Spec

`backend-deployment.yaml`:

```yaml
spec:
  containers:
  - name: backend
    lifecycle:
      preStop:
        exec:
          # 5 saniye grace: LoadBalancer endpoint list'ten bu pod düşene
          # kadar yeni connection gelmesin.
          command: ["/bin/sh", "-c", "sleep 5"]
    # SIGTERM'den exit'e kadar verilen maksimum süre (default 30s)
    terminationGracePeriodSeconds: 30
```

## Test akışı (manuel)

### Lokal Docker

```bash
docker compose up -d backend
docker compose logs -f backend &

# SIGTERM gönder
docker compose stop backend

# Beklenen log:
#   [shutdown] SIGTERM alındı — graceful shutdown başlıyor
#   [GracefulShutdown] Prisma disconnect OK
#   [GracefulShutdown] Redis quit OK
#   [GracefulShutdown] Sentry flush OK
#   [GracefulShutdown] Shutdown tamamlandı (XXXms)
```

### K8s

```bash
kubectl rollout restart deployment sinavsalonu-backend
kubectl logs -f -l app=sinavsalonu,component=backend --since=30s

# Beklenen:
#   - Yeni pod up + ready
#   - Eski pod preStop: 5s sleep
#   - Eski pod SIGTERM + graceful shutdown logu
#   - Hiçbir 502/503 müşteri yanıtı (zero-downtime deploy)
```

## In-flight request davranışı

NestJS HTTP server SIGTERM aldığında:

1. Server.close() çağrılır — yeni TCP connection reddedilir
2. Mevcut connection'lar tamamlanmasını bekler
3. Active connection limit (`server.maxConnections` veya default sınırsız)

**Long-poll endpoint'ler** (`/live-sessions/:id/state` 2s polling): K8s
`terminationGracePeriodSeconds=30` içinde tamamlanır. Daha uzun bir polling
gerekirse `terminationGracePeriodSeconds` artırılmalı.

## BullMQ Worker

Worker'lar ayrı pod'da (`worker-deployment.yaml`). Worker process'inin kendi
SIGTERM handler'ı var (BullMQ documentation):

```typescript
// worker bootstrap'inde
const worker = new Worker('email-critical', processor, { connection });

process.on('SIGTERM', async () => {
  await worker.close(); // mevcut job tamamlanır, yenisi alınmaz
  process.exit(0);
});
```

Worker pod restart'larında current job'lar tamamlanır, yenileri sıraya
girer (Redis'te).

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Pod restart sırasında 502 | preStop hook eksik | `lifecycle.preStop` ekle |
| Shutdown 30s+ sürüyor | Active long-poll request'ler | `terminationGracePeriodSeconds: 60` |
| Prisma "Database is closing" hatası | $disconnect race condition | retry middleware veya gracefulShutdown service log'a bak |
| Sentry event kaybı | flush timeout düşük | `Sentry.flush(5000)` |

## İlgili

- `apps/backend/src/nest/main.ts` — `enableShutdownHooks`
- `apps/backend/src/nest/services/graceful-shutdown.service.ts`
- `infra/helm/sinavsalonu/templates/backend-deployment.yaml`
- `docs/observability/slo.md` — pod restart SLO
