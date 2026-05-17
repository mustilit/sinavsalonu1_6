# Infra

## Docker

`docker/` klasöründe Docker Compose ve Dockerfile'lar bulunur.

### SPA Refresh (Frontend)

Frontend `serve -s dist` ile serve edilir. `-s` flag'i SPA modunu etkinleştirir; tüm route'larda `index.html` döner. Sayfa yenilemede 404 oluşmaz.

### Nginx Reverse Proxy

Nginx kullanıyorsanız SPA fallback için:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```
