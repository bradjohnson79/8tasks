/** Saved searches live on this device (no account). Always free. */
const KEY = "8tasks:saved-searches";
export const SEARCHES_EVENT = "8tasks:saved-searches-changed";
const MAX = 50;

export type SavedSearch = {
  q?: string;
  f: string[];
  path?: string;
  label: string;
  savedAt: string;
};

const sameQuery = (a: SavedSearch, b: Omit<SavedSearch, "savedAt" | "label">) =>
  (a.q ?? "") === (b.q ?? "") &&
  (a.path ?? "") === (b.path ?? "") &&
  [...a.f].sort().join(",") === [...b.f].sort().join(",");

export function getSavedSearches(): SavedSearch[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is SavedSearch =>
          !!s && typeof s === "object" && typeof s.label === "string" && Array.isArray(s.f),
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function write(list: SavedSearch[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Storage unavailable (private mode).
  }
  window.dispatchEvent(new Event(SEARCHES_EVENT));
}

export function isSearchSaved(s: Omit<SavedSearch, "savedAt" | "label">): boolean {
  return getSavedSearches().some((x) => sameQuery(x, s));
}

/** Returns the new saved state. */
export function toggleSearch(s: Omit<SavedSearch, "savedAt">): boolean {
  const list = getSavedSearches();
  if (list.some((x) => sameQuery(x, s))) {
    write(list.filter((x) => !sameQuery(x, s)));
    return false;
  }
  write([{ ...s, savedAt: new Date().toISOString() }, ...list]);
  return true;
}

export function searchHref(s: Pick<SavedSearch, "q" | "f" | "path">): string {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.path) p.set("path", s.path);
  for (const f of s.f) p.append("f", f);
  const qs = p.toString();
  return qs ? `/missions?${qs}` : "/missions";
}
