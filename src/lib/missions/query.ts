/** Helpers for reading and building discovery URLs (?q=&f=&path=&country=&region=&city=). */
export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string): string | undefined {
  const v = sp[key];
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.trim() ? s.trim().slice(0, 120) : undefined;
}

export function params(sp: SearchParams, key: string): string[] {
  const v = sp[key];
  return (Array.isArray(v) ? v : v ? [v] : [])
    .flatMap((x) => x.split(","))
    .filter(Boolean)
    .slice(0, 20);
}

export function buildHref(
  path: string,
  query: Record<string, string | string[] | undefined>,
  hash?: string,
): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
    else if (v) usp.set(k, v);
  }
  const s = usp.toString();
  return `${path}${s ? `?${s}` : ""}${hash ? `#${hash}` : ""}`;
}
