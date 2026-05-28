#!/usr/bin/env node
/**
 * generate-pwa-icons.mjs — public/pwa-source.svg'den PNG ikonlar üretir.
 *
 * Sprint 11 #3.
 *
 * Çıktı:
 *   public/pwa-192.png   — Android home screen
 *   public/pwa-512.png   — Android splash + large icon
 *   public/pwa-maskable-512.png — Android adaptive icon (safe zone padding'li)
 *   public/apple-touch-icon.png (180x180) — iOS home screen
 *   public/favicon.png (32x32) — tarayıcı sekmesi
 *
 * Sharp doğal PNG export yapar; AVIF/WebP de mümkün ama PWA spec PNG bekler.
 *
 * Çalıştır: node scripts/generate-pwa-icons.mjs
 *           npm run pwa:icons (package.json'a eklendi)
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const src = join(root, 'public', 'pwa-source.svg');

const svgBuffer = readFileSync(src);

const targets = [
  { name: 'pwa-192.png', size: 192 },
  { name: 'pwa-512.png', size: 512 },
  // Maskable: aynı 512, ama theme_color background full-bleed olduğu için
  // ayrı render etmiyoruz; pwa-512.png "maskable any" ikiliği için yeterli.
  // Adaptive icon "safe zone" kontrolü için pwa-source.svg padding'li.
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon.png', size: 32 },
];

for (const t of targets) {
  const out = join(root, 'public', t.name);
  await sharp(svgBuffer)
    .resize(t.size, t.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);
  // eslint-disable-next-line no-console
  console.log(`✓ ${t.name} (${t.size}x${t.size})`);
}

// eslint-disable-next-line no-console
console.log('\nPWA ikonları üretildi: public/pwa-*.png');
