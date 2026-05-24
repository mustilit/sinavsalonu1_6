# Sınav Salonu — frontend prod imajı.
#
# 1) Build stage: Vite ile hash'lenmiş static asset üretir.
# 2) Runtime stage: nginx:alpine ile statik servis + CSP/gzip/cache.
#    "serve" (node) yerine nginx kullanılır; CSP başlığı, gzip, asset cache ve SPA
#    fallback için reverse-proxy-grade davranış gerekir.
#
# Build context repo köküdür (../../infra/nginx/* ve apps/frontend/* aynı context'te).

FROM node:20-slim AS builder
WORKDIR /usr/src/app
COPY apps/frontend/package*.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY apps/frontend/ ./
# API URL build anında bundle içine gömülür.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine

# Build çıktısını nginx default root'una kopyala
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Default config'i kaldır; conf.d altına template'den render edeceğiz.
RUN rm -f /etc/nginx/conf.d/default.conf
COPY infra/nginx/default.conf.template /etc/nginx/templates/default.conf.template

# nginx official entrypoint /docker-entrypoint.d/20-envsubst-on-templates.sh ile
# /etc/nginx/templates/*.template'i /etc/nginx/conf.d/'ye envsubst eder.
# Filter listesi olmadan nginx'in run-time değişkenleri ($uri, $request_uri) de
# expand edilir ve bozulur — bu yüzden whitelist gerekli.
ENV NGINX_ENVSUBST_FILTER_VARIABLES="CSP_CONNECT_SRC CSP_SCRIPT_SRC CSP_IMG_SRC CSP_MEDIA_SRC CSP_STYLE_SRC CSP_REPORT_ENDPOINT"

# Container içinden sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O- http://127.0.0.1:5173/healthz || exit 1

EXPOSE 5173

# nginx imajının default CMD'i [nginx, -g, daemon off;] — entrypoint envsubst'ı çalıştırır.
