/**
 * ResponsiveImage — Sprint 11 #2: Sharp pipeline tüketicisi.
 *
 * Backend `/upload/image` artık `responsive: { thumb, srcset, sizes, width, height }`
 * blok döner. Bu component bunu doğrudan `<img srcset>`'e basar. CDN'siz, runtime
 * resize'sız, hash'lenmiş statik dosyalar — Cloudflare'i sadece edge cache için
 * kullanır.
 *
 * KULLANIM:
 *
 *   // 1) Backend upload payload'undan (TestPackage kapak, soru görseli vb.)
 *   <ResponsiveImage
 *     src={pkg.coverImageUrl}
 *     responsive={pkg.coverImageResponsive}  // { srcset, sizes, thumb, width, height }
 *     alt={pkg.title}
 *     className="w-full h-48 object-cover rounded"
 *   />
 *
 *   // 2) Sadece tek URL biliyorsak (legacy kayıtlar) — fallback
 *   <ResponsiveImage src="/uploads/old.jpg" alt="..." />
 *
 *   // 3) Avatar: srcset gereksiz, thumb yeter
 *   <ResponsiveImage src={user.avatarUrl} variant="thumb" alt={user.name} />
 *
 * NEDEN BU KADAR ZIP?
 *   - `loading="lazy"` — viewport altı görseller LCP'yi etkilemez
 *   - `decoding="async"` — main thread'i bloklamaz
 *   - `width`/`height` attribute → CLS=0 (layout reserve edilir)
 *   - `<img srcset>` → 360px ekran 320w varyantı çeker (~80KB), 4K ekran 1024w (~280KB)
 *
 * `priority` (hero) görselleri için `loading="eager"` + `fetchpriority="high"` ver.
 */

import PropTypes from 'prop-types';
import { cdnUrl } from '../../lib/cdn';

/**
 * @typedef {Object} ResponsivePayload
 * @property {string|null} thumb     — 96x96 kare WebP (avatar/kart)
 * @property {string}      srcset    — "url 320w, url 640w, url 1024w"
 * @property {string}      sizes     — "(max-width: 640px) 100vw, 1024px"
 * @property {number}      width     — origin width (CLS reserve için)
 * @property {number}      height    — origin height
 */

export function ResponsiveImage({
  src,
  responsive,
  alt,
  variant = 'auto',
  priority = false,
  className = '',
  sizes: sizesOverride,
  ...rest
}) {
  // Variant=thumb → küçük WebP varsa kullan, yoksa origin'e düş.
  if (variant === 'thumb' && responsive?.thumb) {
    return (
      <img
        src={cdnUrl(responsive.thumb)}
        alt={alt}
        width={96}
        height={96}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        {...(priority ? { fetchpriority: 'high' } : {})}
        {...rest}
      />
    );
  }

  // Sharp payload var → srcset bas
  if (responsive?.srcset) {
    // Backend mutlak URL döner; CDN base set edilmişse onun üstünden geçir.
    // cdnUrl absolute URL gelirse aynen döner, yoksa CDN prefix ekler.
    const rewrittenSrcset = responsive.srcset
      .split(',')
      .map((part) => {
        const trimmed = part.trim();
        const [url, descriptor] = trimmed.split(/\s+/);
        return `${cdnUrl(url)} ${descriptor}`;
      })
      .join(', ');

    return (
      <img
        src={cdnUrl(src || '')}
        srcSet={rewrittenSrcset}
        sizes={sizesOverride || responsive.sizes}
        width={responsive.width || undefined}
        height={responsive.height || undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={className}
        {...(priority ? { fetchpriority: 'high' } : {})}
        {...rest}
      />
    );
  }

  // Fallback: legacy kayıt (Sharp pipeline öncesi) — sadece src
  return (
    <img
      src={cdnUrl(src || '')}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className={className}
      {...(priority ? { fetchpriority: 'high' } : {})}
      {...rest}
    />
  );
}

ResponsiveImage.propTypes = {
  /** Origin image URL (Sharp pipeline öncesi de çalışır) */
  src: PropTypes.string,
  /** Backend `/upload/image` payload'unun `responsive` bloğu */
  responsive: PropTypes.shape({
    thumb: PropTypes.string,
    srcset: PropTypes.string,
    sizes: PropTypes.string,
    width: PropTypes.number,
    height: PropTypes.number,
  }),
  /** Erişilebilirlik için zorunlu — boş string ise dekoratif */
  alt: PropTypes.string.isRequired,
  /** "auto" = srcset, "thumb" = sadece 96px varyant */
  variant: PropTypes.oneOf(['auto', 'thumb']),
  /** Above-the-fold hero görseli için true */
  priority: PropTypes.bool,
  className: PropTypes.string,
  sizes: PropTypes.string,
};

export default ResponsiveImage;
