## Docker backend configuration

`infra/docker/.env` dosyası **zorunludur**. En az aşağıdaki değişkenleri içermelidir:

- `DATABASE_URL`: `postgresql://USER:PASS@HOST:PORT/DB?schema=public` formatında olmalıdır. Docker ağı içinde backend için varsayılan değer `postgresql://postgres:postgres@postgres:5432/dal?schema=public` kullanılabilir.
- `JWT_SECRET`: Geliştirme/deploy ortamına uygun gizli bir anahtar.

`docker compose up` komutunu çalıştırmadan önce bu dosyayı oluşturup değerleri güncellediğinizden emin olun.

