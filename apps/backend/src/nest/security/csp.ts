export function buildCspDirectivesFromEnv() {
  const list = (v?: string) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const withSelf = (arr: string[]) => ["'self'", ...arr.filter((x) => x !== "'self'")];

  const connect = withSelf(list(process.env.CSP_CONNECT_SRC));
  const script = withSelf(list(process.env.CSP_SCRIPT_SRC));
  const img = withSelf([...(list(process.env.CSP_IMG_SRC) || []), 'data:', 'https:']);
  const media = withSelf([...(list(process.env.CSP_MEDIA_SRC) || []), 'https:']);
  const styleList = list(process.env.CSP_STYLE_SRC);
  // CSP_STYLE_SRC env'i tanımlıysa kullanıcı listesi (otomatik 'self' eklenir).
  // Tanımlı değilse: 'self' + 'unsafe-inline' (Tailwind utility'leri inline style
  // tetiklemediği için Report-Only modda violation üretmez; ama next-themes / Radix
  // bazı inline style yazıyor — kaldırmak için nonce/hash stratejisine geçilmeli).
  // Önceki davranış sadece ["'unsafe-inline'"] döndürüyordu — 'self' bile yoktu;
  // bu da style-src'yi gevşek bırakıyordu. 'self' eklemek doğru taban.
  const style = styleList.length
    ? withSelf(styleList)
    : ["'self'", "'unsafe-inline'"];
  const reportEndpoint = process.env.CSP_REPORT_ENDPOINT || '/csp-report';

  return {
    defaultSrc: ["'self'"],
    connectSrc: connect,
    scriptSrc: script,
    imgSrc: img,
    mediaSrc: media,
    styleSrc: style,
    frameAncestors: ["'none'"],
    // helmet accepts reportUri as string
    reportUri: reportEndpoint,
  };
}

