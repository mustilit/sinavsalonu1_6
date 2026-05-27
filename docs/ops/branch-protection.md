# Branch Protection Runbook — main

GitHub UI'da uygulanacak branch protection kuralları. Bu doküman aktif kuralların
referansıdır; UI'dan değişiklik yapılırsa burası da güncellenmeli.

> Adres: https://github.com/mustilit/sinavsalonu1_6/settings/branches

## Hedef

- `main` branch yalnızca PR üzerinden değişir, doğrudan push edilemez
- Tüm commit'ler CI'dan geçmeli (test + lint + typecheck)
- CODEOWNERS onayı zorunlu (güvenlik-kritik dosyalar için)
- Force-push ve branch silme yasak

## Uygulama Adımları (GitHub UI)

### 1. Branch protection rule oluştur

**Settings → Branches → Add branch protection rule**

- **Branch name pattern**: `main`

### 2. Aşağıdaki kuralları aktive et

#### Pull request gereksinimleri
- [x] **Require a pull request before merging**
  - [x] Require approvals: **1**
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners
  - [ ] Restrict who can dismiss pull request reviews (boş bırak — solo proje)
  - [ ] Require approval of the most recent reviewable push (opsiyonel)

#### Status check gereksinimleri
- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks** (CI workflow job adları):
    - `Backend Migrate & Test`
    - `Frontend A11y (Playwright + axe-core)`
    - `Build & Push Docker Images` (release.yml'den)
    - `Mutation Test` SEÇME — `continue-on-error: true` (CI bloklamamalı)

#### Diğer kurallar
- [x] **Require conversation resolution before merging**
- [x] **Require signed commits** (opsiyonel ama önerilir)
- [x] **Require linear history** (merge commit'lerini engeller, rebase/squash zorunlu)
- [x] **Do not allow bypassing the above settings**
  - **Important**: Admin bile bypass edememeli — disaster recovery hariç

#### Engellemeler
- [x] **Restrict pushes that create matching refs** — push'u sadece PR ile aç
- [x] **Allow force pushes**: KAPALI
- [x] **Allow deletions**: KAPALI

### 3. Tag protection (opsiyonel)

**Settings → Tags → New rule**
- Pattern: `v*`
- Yalnızca repo owner/maintainer tag oluşturabilir.

### 4. Doğrulama

PR aç → CI bekle → CODEOWNERS atanmış mı kontrol et → approve → merge butonu ne diyor?

Beklenen davranış:
- CI fail ise "Required statuses must pass" yazısı görünür
- Onaysız PR'da "Required review from Code Owners" yazısı görünür
- `main`'e doğrudan push denemesi:
  ```
  remote: error: GH006: Protected branch update failed for refs/heads/main.
  remote: error: Required status check "Backend Migrate & Test" is expected.
  ```

## Acil Durum (break-glass)

Eğer hot fix gerekiyorsa ve CI yavaşsa:
1. **Settings → Branches → Edit rule** → "Do not allow bypassing" → KAPAT
2. Force-push / direct commit yap
3. **Hemen geri aç** — kuralı tekrar aktive et
4. Audit log'a kaydet (kim, ne zaman, neden bypass yaptı)

## CI Status Check İsimleri Doğrulama

GitHub branch protection UI'sında "Require status checks" listesi sadece **daha önce
başarıyla koşmuş** workflow job'larını gösterir. Yeni bir job eklenince:
1. Önce o job'u en az 1 kez koştur (PR aç + merge et)
2. Sonra branch protection rule'a ekle

## İlgili Dokümanlar

- `.github/workflows/backend-migrate-and-test.yml` — backend + frontend a11y CI
- `.github/workflows/release.yml` — semantic-release otomasyonu
- `.github/CODEOWNERS` — review atama kuralları
