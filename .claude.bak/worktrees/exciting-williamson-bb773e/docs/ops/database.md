## PgBouncer ve Database Mimarisi

Bu proje yüksek eşzamanlı kullanıcı (örn. 10k concurrent) hedefiyle tasarlandığı için, doğrudan Prisma → Postgres bağlantısı yerine bir connection pooler kullanmak daha stabildir.

Önerilen mimari:

```text
client → nginx/reverse-proxy → backend (NestJS/Prisma) → PgBouncer → Postgres
```

### Neden PgBouncer?

- Prisma kendi connection pool’una sahip olsa da:
  - Uygulama ölçeklendikçe (birden çok backend replica) toplam bağlantı sayısı hızla artar.
  - Postgres `max_connections` limiti genelde 100–300 civarındadır.
- PgBouncer:
  - Bağlantıları merkezî olarak havuzlar.
  - Backend pod/container sayısından bağımsız olarak Postgres’e sınırlı, kontrollü sayıda bağlantı açar.
  - Özellikle çok sayıda kısa ömürlü sorgu (test çözme, request başına select/insert) için idealdir.

### POOL_MODE=transaction Nedir?

- `POOL_MODE=transaction`:
  - Her **transaction** bittikten sonra connection hemen pool’a geri döner.
  - Session-level state (ör. `SET LOCAL`, temp tables, uzun süre açık cursor’lar) saklanmaz.
- Bu mod:
  - Yüksek concurrency senaryolarında connection verimliliği için en iyi seçimdir.
  - Prisma gibi ORM’lerle genelde uyumludur, çünkü sorgular kısa transaction’lar halinde çalışır.
- Dikkat:
  - Uzun süre açık transaction’lardan kaçınmalısınız.
  - Transaction dışında session state’e (örn. `SET ROLE`, `SET search_path`) güvenmemelisiniz.

### Pool parametreleri: DEFAULT_POOL_SIZE ve MAX_CLIENT_CONN

Compose override’daki varsayılanlar:

- `DEFAULT_POOL_SIZE=50`:
  - PgBouncer’ın **Postgres’e** açacağı aktif bağlantı sayısını (her DB için) belirler.
  - Örneğin Postgres tarafında `max_connections=200` ise:
    - `DEFAULT_POOL_SIZE` + `RESERVE_POOL_SIZE` toplamını bu değerin altında tutmalısınız.
- `MAX_CLIENT_CONN=1000`:
  - PgBouncer’ın **backend client’lardan** kabul edebileceği eşzamanlı bağlantı sayısı.
  - Genelde backend replica sayısı × (worker thread sayısı) × bir güvenlik katsayısı şeklinde seçilir.

Öneri:

- Geliştirme ortamı için mevcut değerler yeterli.
- Production’da:
  - Postgres `max_connections` ve instance boyutuna göre yeniden hesaplayın.
  - Gerektiğinde farklı DB’ler için ayrı PgBouncer instance’ı kullanın.

### Uzun Transaction’lardan Kaçınma

`POOL_MODE=transaction` ile:

- Uzun süre açık kalan transaction’lar (ör. dakikalarca süren rapor sorguları) pool’u kilitleyebilir.
- Tavsiyeler:
  - Uzun rapor sorgularını mümkünse read-replica veya ayrı bir connection/pool üzerinden çalıştırın.
  - Uygulamada “işlem başlat → uzun süre bekle → aynı transaction içinde başka query” deseninden kaçının.

### Çalıştırma Komutları

- **Normal (PgBouncer olmadan):**

  ```bash
  cd infra/docker
  docker compose up -d
  ```

- **PgBouncer ile birlikte:**

  ```bash
  cd infra/docker
  docker compose -f docker-compose.yml -f docker-compose.pgbouncer.yml up -d
  ```

  Bu override, `pgbouncer` servisini ekler ve `backend` servisini PgBouncer üzerinden bağlayacak şekilde `DATABASE_URL` değerini değiştirir.

  PgBouncer ile çalışırken `DATABASE_URL` sonunda genellikle ekstra bir bayrak da kullanılır:

  ```env
  DATABASE_URL=postgresql://postgres:postgres@pgbouncer:6432/dal?schema=public&pgbouncer=true
  ```

### Hızlı Teşhis Komutları

- **Backend DB health:**

  ```bash
  curl -fsS http://localhost:3000/health/db
  ```

- **Container health durumu:**

  ```bash
  docker ps
  # backend container'ı için STATUS sütununda (healthy/unhealthy) görünür
  ```

- **DB hazır mı?**

  ```bash
  cd infra/docker
  docker compose exec postgres pg_isready -U postgres
  ```

- **Aktif bağlantı sayısı:**

  ```bash
  cd infra/docker
  docker compose exec postgres psql -U postgres -d dal -c "select count(*) from pg_stat_activity;"
  ```

### Prisma + PgBouncer Notu

- Prisma, `POOL_MODE=transaction` ile genellikle sorunsuz çalışır.
- Edge-case’ler:
  - Eğer ileride uzun süre açık transaction’lar veya session state’e bağımlı işlemler eklenirse,
    bu endpointler için PgBouncer’ı bypass eden ayrı bir bağlantı (veya read-replica) tasarlamak gerekebilir.
- Bu yüzden PgBouncer şu anda **opsiyonel bir override** olarak kurgulanmıştır; local geliştirmede veya küçük deployment’larda zorunlu değildir, ancak ölçek arttığında kolayca devreye alınabilir.

