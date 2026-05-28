/**
 * Image processing pipeline — Sharp tabanlı responsive variant üretici.
 *
 * SENARYO:
 *   Eğitici 4MB / 4032x3024 telefon fotoğrafı yüklüyor. Mobil aday 360px
 *   ekranda bu dosyayı çekiyor → 4MB indir, browser CPU resize → janky scroll
 *   + LCP > 4s. Lighthouse Performance < 60.
 *
 *   Pipeline çözer:
 *     - Origin'i once normalize et (orientation, EXIF strip, sRGB)
 *     - 3 responsive boyut üret: 320w, 640w, 1024w
 *     - Her boyuttan modern WebP varyantı yaz (~30-50% küçük JPEG'e göre)
 *     - 96x96 thumbnail (avatar, kart önizleme)
 *
 *   Frontend `<img srcset>` kullanır:
 *     <img
 *       src="/uploads/abc-1024w.webp"
 *       srcset="/uploads/abc-320w.webp 320w,
 *               /uploads/abc-640w.webp 640w,
 *               /uploads/abc-1024w.webp 1024w"
 *       sizes="(max-width: 640px) 100vw, 1024px"
 *       loading="lazy"
 *     />
 *
 *   Browser ekran boyutuna göre en uygun varyantı indirir → 4MB yerine ~80KB.
 *
 * GIF KARARI:
 *   GIF'leri yeniden işlemiyoruz (animasyon kaybolur). Origin file döner,
 *   variants boş döner. CSS ile boyutlandırılır.
 *
 * EXIF / GÜVENLİK:
 *   Sharp varsayılan olarak EXIF strip yapar (`withMetadata` çağrılmazsa).
 *   Bu, GPS koordinatı + cihaz bilgisi sızıntısını engeller.
 *
 * ORIENTATION:
 *   Telefon fotoğrafı çoğu zaman EXIF Orientation=6 (rotate 90). Sharp
 *   `.rotate()` (parametresiz) bunu otomatik düzeltir, sonra metadata strip
 *   olunca tarayıcı yeniden döndürmeye kalkışmaz.
 *
 * KAPSAM DIŞI (Phase 2):
 *   - AVIF varyantları (browser support < %90 hala) — Sprint 12'ye
 *   - S3 multipart upload — şu an local disk
 *   - On-demand resize (CDN behind /uploads/) — şu an precompute
 */

import sharp from 'sharp';
import { join } from 'path';
import { writeFile } from 'fs/promises';
import type { DetectedFile } from '../../security/fileTypeDetection';

/** Üretilecek genişlikler — `<img srcset>` ile birebir uyumlu. */
export const RESPONSIVE_WIDTHS = [320, 640, 1024] as const;
export const THUMBNAIL_SIZE = 96;

export type ResponsiveWidth = (typeof RESPONSIVE_WIDTHS)[number];

export interface ImageVariant {
  label: string; // "320w" | "640w" | "1024w" | "thumb"
  width: number;
  height: number;
  format: 'jpeg' | 'png' | 'webp';
  filename: string;
  bytes: number;
}

export interface ProcessedImage {
  /** Origin (normalize edilmiş, EXIF strip + auto-rotate uygulanmış). */
  original: ImageVariant;
  /** 320w/640w/1024w + thumbnail. GIF için boş. */
  variants: ImageVariant[];
  /** Sharp metadata snapshot. */
  meta: {
    width: number;
    height: number;
    format: string;
    bytes: number;
  };
}

export interface ImageProcessorOptions {
  /** Yazılacak hedef dizin. */
  outputDir: string;
  /** Çıktı dosyalarının ortak slug'ı (örn. crypto hex). */
  baseSlug: string;
  /** Origin file metadata (magic-byte tespiti). */
  detected: DetectedFile;
}

/**
 * Buffer'ı Sharp ile işleyip varyantları diske yazar.
 *
 * `detected.type === 'gif'` → tek dosya, varyant yok.
 * Diğer formatlarda 4 varyant: 320w/640w/1024w/thumb. Hepsi WebP yazar.
 * Origin dosya kendi formatında kalır (JPEG → .jpg, PNG → .png, WebP → .webp).
 */
export async function processImage(
  buffer: Buffer,
  opts: ImageProcessorOptions,
): Promise<ProcessedImage> {
  const { outputDir, baseSlug, detected } = opts;

  // --- GIF: animasyonu bozmamak için pass-through ---
  if (detected.type === 'gif') {
    const filename = `${baseSlug}${detected.extension}`;
    const fullPath = join(outputDir, filename);
    await writeFile(fullPath, buffer);
    const meta = await sharp(buffer, { animated: true }).metadata();
    return {
      original: {
        label: 'origin',
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: 'png', // animated GIF, ama tip union'a uyumlu kalsın
        filename,
        bytes: buffer.length,
      },
      variants: [],
      meta: {
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: 'gif',
        bytes: buffer.length,
      },
    };
  }

  // --- Origin: rotate + strip metadata, kendi formatında yaz ---
  // `.rotate()` parametresiz → EXIF Orientation'u uygula, sonra strip et.
  const normalized = sharp(buffer).rotate();
  const meta = await normalized.metadata();

  const originPipeline = applyFormat(normalized.clone(), detected.type);
  const originBuffer = await originPipeline.toBuffer();
  const originFilename = `${baseSlug}${detected.extension}`;
  await writeFile(join(outputDir, originFilename), originBuffer);

  const original: ImageVariant = {
    label: 'origin',
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    format: detected.type === 'webp' ? 'webp' : detected.type === 'png' ? 'png' : 'jpeg',
    filename: originFilename,
    bytes: originBuffer.length,
  };

  // --- Responsive WebP varyantları ---
  // Kaynaktan büyük üretmiyoruz (`withoutEnlargement: true`).
  const variants: ImageVariant[] = [];
  for (const w of RESPONSIVE_WIDTHS) {
    const v = await renderVariant(buffer, {
      width: w,
      label: `${w}w`,
      baseSlug,
      outputDir,
    });
    if (v) variants.push(v);
  }

  // --- Thumbnail (square crop, smartcrop) ---
  const thumb = await renderVariant(buffer, {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    label: 'thumb',
    baseSlug,
    outputDir,
    fit: 'cover',
  });
  if (thumb) variants.push(thumb);

  return {
    original,
    variants,
    meta: {
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: meta.format ?? detected.type,
      bytes: buffer.length,
    },
  };
}

interface VariantRenderOpts {
  width: number;
  height?: number;
  label: string;
  baseSlug: string;
  outputDir: string;
  fit?: 'cover' | 'inside';
}

async function renderVariant(
  buffer: Buffer,
  o: VariantRenderOpts,
): Promise<ImageVariant | null> {
  // Origin'den her zaman yeni pipeline; clone() animated GIF olmadığı için güvenli.
  const pipeline = sharp(buffer)
    .rotate()
    .resize({
      width: o.width,
      height: o.height,
      fit: o.fit ?? 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 });

  const data = await pipeline.toBuffer({ resolveWithObject: true });
  // resize sonrası gerçek genişlik/yükseklik info içinde geliyor.
  const filename = `${o.baseSlug}-${o.label}.webp`;
  await writeFile(join(o.outputDir, filename), data.data);

  return {
    label: o.label,
    width: data.info.width,
    height: data.info.height,
    format: 'webp',
    filename,
    bytes: data.data.length,
  };
}

/** Origin output için tip-spesifik encoder + kalite ayarı. */
function applyFormat(
  pipeline: sharp.Sharp,
  type: DetectedFile['type'],
): sharp.Sharp {
  switch (type) {
    case 'jpeg':
      return pipeline.jpeg({ quality: 82, mozjpeg: true });
    case 'png':
      return pipeline.png({ compressionLevel: 9, palette: true });
    case 'webp':
      return pipeline.webp({ quality: 82, effort: 4 });
    default:
      return pipeline;
  }
}

/**
 * URL builder — controller `<img srcset>` için frontend'in tükettiği shape'i çevirir.
 *
 * Çıktı:
 *   {
 *     original: '/uploads/abc.jpg',
 *     thumb:    '/uploads/abc-thumb.webp',
 *     srcset:   '/uploads/abc-320w.webp 320w, /uploads/abc-640w.webp 640w, /uploads/abc-1024w.webp 1024w',
 *     sizes:    '(max-width: 640px) 100vw, 1024px'
 *   }
 */
export function buildImageUrls(processed: ProcessedImage, baseUrl: string) {
  const base = `${baseUrl}/uploads`;
  const srcsetParts: string[] = [];
  let thumb: string | null = null;

  for (const v of processed.variants) {
    if (v.label === 'thumb') {
      thumb = `${base}/${v.filename}`;
    } else if (v.label.endsWith('w')) {
      srcsetParts.push(`${base}/${v.filename} ${v.label}`);
    }
  }

  return {
    original: `${base}/${processed.original.filename}`,
    thumb,
    srcset: srcsetParts.join(', '),
    // 640px altı mobile → tam viewport; üstü desktop → max 1024px container.
    sizes: '(max-width: 640px) 100vw, 1024px',
    width: processed.original.width,
    height: processed.original.height,
  };
}
