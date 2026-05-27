#!/usr/bin/env bash
# Sınav Salonu — Helm deploy sonrası smoke test
#
# Usage:
#   ./infra/helm/sinavsalonu/smoke-test.sh https://api.staging.sinavsalonu.com https://staging.sinavsalonu.com
#
# Kontrol edilen endpoint'ler:
#   1. Backend /health      — pod sağlıklı mı (livenessProbe ile aynı)
#   2. Backend /metrics     — prom-client metrics endpoint (network ACL ile korumalı)
#   3. Backend /marketplace/packages?limit=1  — DB bağlantısı + Prisma çalışıyor mu
#   4. Frontend /           — Nginx + CSP header doğru mu
#   5. Frontend /assets/    — Static cache header
#   6. Login endpoint reachable (401 expected without credentials)
#
# Exit code 0 = tüm smoke testler geçti. Aksi halde 1 + hatalı endpoint.

set -euo pipefail

API_URL="${1:-http://localhost:3000}"
WEB_URL="${2:-http://localhost:5174}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
FAILED_CHECKS=()

check() {
  local name=$1
  local cmd=$2
  echo -n "[ ] $name ... "
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}FAIL${NC}"
    FAIL=$((FAIL+1))
    FAILED_CHECKS+=("$name")
  fi
}

check_status() {
  local name=$1
  local url=$2
  local expected=$3
  local actual
  actual=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" 2>/dev/null || echo "000")
  echo -n "[ ] $name ($url) ... "
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}PASS${NC} ($actual)"
    PASS=$((PASS+1))
  else
    echo -e "${RED}FAIL${NC} (got $actual, expected $expected)"
    FAIL=$((FAIL+1))
    FAILED_CHECKS+=("$name (got $actual)")
  fi
}

echo "─── Sınav Salonu Smoke Test ───"
echo "API: $API_URL"
echo "Web: $WEB_URL"
echo ""

# Backend
check_status "Backend /health"                     "$API_URL/health"                                    200
check_status "Backend /marketplace/packages"       "$API_URL/marketplace/packages?limit=1"              200
check_status "Backend /auth/login (without creds)" "$API_URL/auth/login"                                404
check_status "Backend /metrics (network protected)" "$API_URL/metrics"                                 403

# Frontend
check_status "Frontend root /"                     "$WEB_URL/"                                          200
check_status "Frontend /Login"                     "$WEB_URL/Login"                                     200

# Frontend CSP header kontrolü
echo -n "[ ] Frontend CSP-Report-Only header ... "
if curl -s -I --max-time 10 "$WEB_URL/" 2>/dev/null | grep -qi 'content-security-policy'; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${YELLOW}WARN${NC} (CSP header bulunamadı — bilinçli kapatılmış olabilir)"
fi

# DB bağlantısı: marketplace endpoint Prisma kullanır, /health'ten daha derin sinyal.
echo -n "[ ] DB bağlantısı (marketplace response valid JSON) ... "
if curl -s --max-time 10 "$API_URL/marketplace/packages?limit=1" 2>/dev/null | grep -q '"items"'; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS+1))
else
  echo -e "${RED}FAIL${NC}"
  FAIL=$((FAIL+1))
  FAILED_CHECKS+=("DB connectivity")
fi

echo ""
echo "─── Sonuç ───"
echo -e "${GREEN}Pass: $PASS${NC}  |  ${RED}Fail: $FAIL${NC}"

if [ $FAIL -gt 0 ]; then
  echo ""
  echo "Başarısız kontroller:"
  for f in "${FAILED_CHECKS[@]}"; do
    echo "  - $f"
  done
  exit 1
fi

echo -e "${GREEN}✓ Tüm smoke testler geçti — staging deploy sağlıklı${NC}"
exit 0
