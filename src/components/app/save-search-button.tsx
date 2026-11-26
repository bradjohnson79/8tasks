"use client";

import { BellPlus, Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  isSearchSaved,
  SEARCHES_EVENT,
  toggleSearch,
  type SavedSearch,
} from "./saved-search-store";

/** "Save this search" on Discover: stored on this device, free, no account. */
export function SaveSearchButton({ search }: { search: Omit<SavedSearch, "savedAt"> }) {
  const [saved, setSaved] = useState(false);
  const key = JSON.stringify([search.q, search.path, search.f]);
  useEffect(() => {
    const sync = () => setSaved(isSearchSaved(search));
    sync();
    window.addEventListener(SEARCHES_EVENT, sync);
    return () => window.removeEventListener(SEARCHES_EVENT, sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => setSaved(toggleSearch(search))}
      className="flex min-h-11 items-center gap-2 rounded-xl border bg-surface px-3 text-sm font-medium hover:border-emerald"
    >
      {saved ? (
        <Check className="size-4 text-emerald" aria-hidden />
      ) : (
        <BellPlus className="size-4" aria-hidden />
      )}
      {saved ? "Search saved" : "Save this search"}
    </button>
  );
}
