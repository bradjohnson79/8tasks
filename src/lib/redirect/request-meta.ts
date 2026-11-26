const BOT_RE =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|headless/i;

export function deviceTypeFromUA(
  ua: string | null,
): "mobile" | "tablet" | "desktop" | "other" {
  if (!ua) return "other";
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  if (/windows|macintosh|linux|cros/i.test(ua)) return "desktop";
  return "other";
}

export function isBotUA(ua: string | null): boolean {
  return !ua || BOT_RE.test(ua);
}

/** Only keeps the path of a same-origin referer; anything else is dropped. */
export function sourcePathFromReferer(
  referer: string | null,
  siteOrigin: string,
): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.origin !== new URL(siteOrigin).origin) return null;
    return url.pathname.slice(0, 256);
  } catch {
    return null;
  }
}

export function countryFromHeader(value: string | null): string | null {
  return value && /^[A-Z]{2}$/.test(value) ? value : null;
}
