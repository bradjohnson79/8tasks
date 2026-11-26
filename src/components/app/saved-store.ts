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

type ItemSync = (id: string, saved: boolean) => void;
let itemSync: ItemSync | null = null;
/** When signed in, SavedSync registers a callback that mirrors changes to the account. */
export function setItemSync(fn: ItemSync | null) {
  itemSync = fn;
}

export function replaceSavedIds(ids: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 500)));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
}

/** Sign-out on a shared device: forget the account's copy kept in this browser. */
export function clearLocalAccountCache() {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem("8tasks:saved-searches");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SAVED_EVENT));
  window.dispatchEvent(new Event("8tasks:saved-searches-changed"));
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
  itemSync?.(id, next.includes(id));
  return next.includes(id);
}
