"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSavedSearches,
  SEARCHES_EVENT,
  searchHref,
  toggleSearch,
  type SavedSearch,
} from "@/components/app/saved-search-store";

export function SavedSearches() {
  const [list, setList] = useState<SavedSearch[] | null>(null);
  useEffect(() => {
    const sync = () => setList(getSavedSearches());
    sync();
    window.addEventListener(SEARCHES_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SEARCHES_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  if (!list) return null;
  return (
    <section aria-labelledby="saved-searches-title" className="flex flex-col gap-3">
      <h2 id="saved-searches-title" className="text-lg font-semibold">
        Saved searches
      </h2>
      {list.length === 0 ? (
        <p className="text-sm text-text-2">
          Search or filter on{" "}
          <Link href="/missions" className="text-emerald hover:underline">
            Discover
          </Link>{" "}
          and tap “Save this search” to keep it here. Results update as new verified listings are
          added.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((s) => (
            <li
              key={s.savedAt}
              className="flex items-center gap-2 rounded-xl border bg-surface pr-1"
            >
              <Link
                href={searchHref(s)}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-4 text-sm hover:text-emerald"
              >
                <Search className="size-4 shrink-0 text-text-2" aria-hidden />
                <span className="truncate">{s.label || "All missions"}</span>
              </Link>
              <button
                type="button"
                onClick={() => toggleSearch(s)}
                aria-label={`Remove saved search ${s.label}`}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-text-2 hover:text-foreground"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
