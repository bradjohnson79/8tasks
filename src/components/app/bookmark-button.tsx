"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isSaved, SAVED_EVENT, toggleSaved } from "./saved-store";

/**
 * Save an opportunity on this device (no account needed). Accounts are not yet
 * approved, so saves live in localStorage and the Saved page says so.
 */
export function BookmarkButton({
  id,
  title,
  className,
}: {
  id: string;
  title: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const sync = () => setSaved(isSaved(id));
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [id]);

  return (
    <>
      <button
        type="button"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
        onClick={() => {
          const now = toggleSaved(id);
          setSaved(now);
          setAnnounce(now ? "Saved on this device" : "Removed from saved");
        }}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl transition-colors active:scale-95",
          saved ? "text-emerald" : "text-text-2 hover:bg-elevated hover:text-foreground",
          className,
        )}
      >
        {saved ? (
          <BookmarkCheck className="size-5" aria-hidden />
        ) : (
          <Bookmark className="size-5" aria-hidden />
        )}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {announce}
      </span>
    </>
  );
}
