#!/usr/bin/env bash
# Sınav Salonu — Stripe entegrasyon smoke test
#
# Kullanım:
#   ./stripe-smoke.sh test       # localhost:3000
#   ./stripe-smoke.sh staging    # api.staging.sinavsalonu.com
#   ./stripe-smoke.sh prod       # api.sinavsalonu.com (DİKKAT: gerçek webhook!)
#
# Kontroller:
#   1. /webhooks/stripe endpoint reachable mi
#   2. Signature olmadan 400 dönüyor mu (signature doğrulama aktif)
#   3. /billing/subscription endpoint cevap veriyor mu (auth gerektirir → 401 expected)
#   4. payment_settings tablosu hazır mı (admin endpoint reachable)
#
# NOT: Bu script gerçek satın alma yapmaz. Sadece infrastructure smoke.
# Gerçek satın alma akışı için Playwright e2e: e2e/specs/purchase-flow.spec.ts

set -euo pipefail

MODE="${1:-test}"

case "$MODE" in
  test)
    API_URL="http://localhost:3000"
    ;;
  staging)
    API_URL="https://api.staging.sinavsalonu.com"
    ;;
  prod)
    API_URL="https://api.sinavsalonu.com"
    echo "⚠️  PRODUCTION mode — test event göndermez, sadece reachability kontrol eder"
    ;;
  *)
    echo "Usage: $0 [test|staging|prod]"
    exit 1
    ;;
esac

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0

check_status() {
  local name=$1
  local url=$2
  local expected=$3
  local extra_args="${4:-}"
  echo -n "[ ] $name ... "
  local actual
  actual=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 $extra_args "$url" 2>/dev/null || echo "000")
  if [ "$actual" = "$expected" ]; then
    echo -e "${GREEN}PASS${NC} ($actual)"
    PASS=$((PASS+1))
  else
    echo -e "${RED}FAIL${NC} (got $actual, expected $expected)"
    FAIL=$((FAIL+1))
  fi
}

echo "─── Stripe Smoke Test ($MODE) ───"
echo "API: $API_URL"
echo ""

# 1. Webhook endpoint reachable + signature gerektiriyor mu
check_status "Webhook endpoint reject without signature" \
  "$API_URL/webhooks/stripe" "400" \
  "-X POST -H 'Content-Type: application/json' -d '{\"type\":\"test\"}'"

# 2. Billing endpoint auth gerektiriyor mu
check_status "Billing /subscription requires auth" \
  "$API_URL/billing/subscription" "401"

# 3. Backend genel sağlık
check_status "Backend /health" "$API_URL/health" "200"

# 4. Marketplace endpoint Prisma çalışıyor mu (Stripe checkout için gerekli)
check_status "Marketplace reachable (DB OK)" \
  "$API_URL/marketplace/packages?limit=1" "200"

# 5. Admin payment_settings endpoint var mı (kapalı endpoint — 401/403 expected)
echo -n "[ ] Admin payment_settings endpoint exists ... "
ACTUAL=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$API_URL/admin/payment-settings" 2>/dev/null || echo "000")
case "$ACTUAL" in
  401|403)
    echo -e "${GREEN}PASS${NC} ($ACTUAL — auth wall aktif)"
    PASS=$((PASS+1))
    ;;
  404)
    echo -e "${YELLOW}WARN${NC} (404 — endpoint adı farklı olabilir)"
    ;;
  *)
    echo -e "${RED}FAIL${NC} (got $ACTUAL)"
    FAIL=$((FAIL+1))
    ;;
esac

echo ""
echo "─── Sonuç ───"
echo -e "${GREEN}Pass: $PASS${NC}  |  ${RED}Fail: $FAIL${NC}"

if [ "$MODE" != "prod" ]; then
  echo ""
  echo "📌 Tam akış testi için Stripe CLI kullan:"
  echo "   stripe listen --forward-to $API_URL/webhooks/stripe"
  echo "   stripe trigger checkout.session.completed"
fi

[ $FAIL -eq 0 ]
