# Frontend Yeniden Yapılandırma Notları

**Tarih:** 2026-03-02  
**Amaç:** Tasarımı bozmadan, sayfa yükleme / auth / routing / API entegrasyonunu stabil hale getirmek ve tekrarlayan hataları azaltmak.

---

## Değişiklik Özeti

### 1) Router/Navigation standardizasyonu
- **Neden**: `window.location.href` tam sayfa yenileme yaparak auth state + react-query cache + SPA routing davranışını kırabiliyordu.
- **Etki**: Sayfalar arası geçişler artık SPA içinde `navigate()` ile yapılıyor (Login/Register/Home/Explore/TestDetail/TakeTest/CreateTest vb).
- **Risk**: Çok düşük; yalnızca gezinme yöntemi değişti.
- **Rollback**: İlgili sayfalarda `navigate(...)` → `window.location.href = ...` geri alınabilir.

### 2) 404 sayfası artık backend’e istek atmıyor
- **Neden**: `PageNotFound` içinde `base44.auth.me()` çağrısı gereksiz istek üretip rate-limit/CORS/401 kaynaklı zincir hatalara yol açabiliyordu.
- **Etki**: 404 ekranı yalnızca `AuthContext` kullanıcı bilgisini kullanıyor.
- **Risk**: Yok; sadece gereksiz network kaldırıldı.
- **Rollback**: Eski react-query ile `me()` çağrısı geri getirilebilir (önerilmez).

### 3) Auth role switch stabilitesi (logout→login)
- **Neden**: Rol değişiminde stale react-query cache “yanlış kullanıcı” verileriyle sayfaların bozulmasına neden olabiliyor.
- **Etki**: Auth hatasında ve login/logout akışında query cache temizliği artırıldı.
- **Risk**: Login sonrası ilk açılışta ekstra refetch olabilir.
- **Rollback**: Cache temizliği çağrıları kaldırılabilir.

### 4) Backend: Admin kullanıcı listesi ve update endpoint’leri
- **Neden**: Frontend `ManageUsers/AdminDashboard` gibi sayfalar “User entity stub” yüzünden eksik/bozuk çalışıyordu.
- **Etki**: Backend’e `GET /admin/users` ve `PATCH /admin/users/:id` eklendi; frontend `base44.entities.User.*` artık gerçek endpoint’e bağlı.
- **Risk**: Admin endpoint’leri yalnızca `ADMIN` rolü ile korunur; yanlış kullanımda 401/403 döner.
- **Rollback**: `AdminUsersController` kaldırılıp frontend’de stub’a dönülebilir (özellik kaybı).

### 5) Backend: Educator profile erişimi (email ile)
- **Neden**: Frontend bazı yerlerde eğitici kimliğini “email” parametresiyle taşıyordu; backend sadece id bekliyordu.
- **Etki**: `GET /educators/by-email?email=...` eklendi.
- **Risk**: Düşük; sadece public lookup.
- **Rollback**: Route kaldırılır; frontend yalnızca id ile çalışacak şekilde güncellenir.

### 6) Windows localhost/IPv6 çakışması azaltıldı
- **Neden**: `localhost` IPv6 (`::1`) üzerinden farklı process’e gidebiliyor, bu da “route yok/404” gibi yanıltıcı hatalara yol açıyordu.
- **Etki**: Vite proxy backend target `127.0.0.1`’e sabitlendi, `.env.example` güncellendi.
- **Risk**: Çok düşük.
- **Rollback**: `127.0.0.1` → `localhost` geri alınabilir (önerilmez).

---

## Bilinen Kısıtlar
- Bazı sayfalar (davet/Invite gibi) backend tarafında tam ürünleştirilmemiş olabilir. Bu alanlar sıradaki adımda netleştirilecek.

