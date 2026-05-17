/**
 * Env doğrulama - eksik env'de build-time hata (zod ile)
 * VITE_ prefix'li değişkenler Vite tarafından expose edilir.
 */
import { z } from 'zod';

const envSchema = z.object({
  /** API base URL - dev'de boş bırakılabilir (proxy kullanılır), prod'da zorunlu */
  VITE_API_BASE_URL: z.string().optional(),
  /** Eski isim - uyumluluk için */
  VITE_API_URL: z.string().optional(),
  /** Build modu */
  MODE: z.enum(['development', 'production', 'test']).optional(),
});

/** Parse edilmiş env - tek sefer validate */
let _env = null;

/**
 * @returns {{ VITE_API_BASE_URL?: string; VITE_API_URL?: string; MODE?: string }}
 */
function parseEnv() {
  if (_env) return _env;
  const raw = {
    VITE_API_BASE_URL: import.meta.env?.VITE_API_BASE_URL,
    VITE_API_URL: import.meta.env?.VITE_API_URL,
    MODE: import.meta.env?.MODE,
  };
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    if (import.meta.env?.MODE === 'test') {
      _env = {};
      return _env;
    }
    console.error('[env] Validation failed:', result.error.flatten());
    throw new Error(`Env validation failed: ${result.error.message}`);
  }
  _env = result.data;
  return _env;
}

/**
 * API base URL - VITE_API_BASE_URL veya VITE_API_URL
 * Dev'de boş string = proxy kullan (relative path)
 * @returns {string}
 */
export function getApiBaseUrl() {
  const env = parseEnv();
  const raw = env.VITE_API_BASE_URL || env.VITE_API_URL;
  if (raw) {
    // Bazı ortamlarda env değerleri yanlışlıkla tırnaklı gelebiliyor:
    // VITE_API_URL='"http://127.0.0.1:3000"'
    // Bu durumda base URL `"%22http://127.0.0.1:3000%22` gibi bozuluyor.
    const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, '');
    return trimmed.replace(/\/$/, '');
  }

  // Dev: Vite proxy kullanıyorsak boş (relative path)
  if (typeof window !== 'undefined') {
    const port = window.location?.port;
    if (port === '5174') return ''; // Vite dev proxy
    if (port === '5173') return 'http://localhost:3000'; // Docker frontend
  }
  return '';
}

export { parseEnv };
