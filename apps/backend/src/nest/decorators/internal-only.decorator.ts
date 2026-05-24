import { SetMetadata } from '@nestjs/common';

export const INTERNAL_ONLY_KEY = 'internal_only';

/**
 * Endpoint'i sadece ağ-düzeyi allowlist'ten erişilebilir kılar.
 * METRICS_ALLOWED_IPS env (virgülle ayrılmış) veya boşsa loopback-only.
 */
export const InternalOnly = () => SetMetadata(INTERNAL_ONLY_KEY, true);
