const KEY = "8tasks:saved";
export const SAVED_EVENT = "8tasks:saved-changed";

export function getSavedIds(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string").slice(0, 500)
      : [];
  } catch {
    return [];
  }
}

export function isSaved(id: string): boolean {
  return getSavedIds().includes(id);
}

/** Returns the new saved state. */
export function toggleSaved(id: string): boolean {
  const ids = getSavedIds();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode): state still updates for this page view.
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
  return next.includes(id);
}
