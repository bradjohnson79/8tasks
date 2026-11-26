"use client";

import { useEffect } from "react";
import { setSaved, setSavedSearch, syncSaved } from "@/app/(site)/profile/actions";
import { getSavedIds, replaceSavedIds, setItemSync } from "@/components/app/saved-store";
import {
  getSavedSearches,
  replaceSavedSearches,
  setSearchSync,
} from "@/components/app/saved-search-store";

/**
 * Signed in: merges what was saved on this device into the account once, then mirrors every
 * save/unsave to the account. Guests keep using device-only storage. Renders nothing.
 */
export function SavedSync({ signedIn }: { signedIn: boolean }) {
  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    syncSaved({ items: getSavedIds(), searches: getSavedSearches() })
      .then((merged) => {
        if (cancelled) return;
        replaceSavedIds(merged.items);
        replaceSavedSearches(merged.searches);
      })
      .catch(() => {
        // Offline or signed out meanwhile: device storage still works.
      });
    setItemSync((id, saved) => void setSaved(id, saved).catch(() => {}));
    setSearchSync((s, saved) => void setSavedSearch(s, saved).catch(() => {}));
    return () => {
      cancelled = true;
      setItemSync(null);
      setSearchSync(null);
    };
  }, [signedIn]);
  return null;
}
