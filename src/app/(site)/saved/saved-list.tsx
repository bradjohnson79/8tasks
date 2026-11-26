"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/app/empty-state";
import { getSavedIds, SAVED_EVENT } from "@/components/app/saved-store";

/** Shows the saved subset of server-rendered cards, in save order. */
export function SavedList({ cards }: { cards: { id: string; node: React.ReactNode }[] }) {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    const sync = () => setIds(getSavedIds());
    sync();
    window.addEventListener(SAVED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SAVED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (ids === null)
    return <div className="h-40 animate-pulse rounded-2xl bg-surface" aria-label="Loading saved" />;
  const byId = new Map(cards.map((c) => [c.id, c.node]));
  const visible = ids.filter((id) => byId.has(id));
  if (!visible.length) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved opportunities"
        description="Tap the bookmark on any mission to keep it here."
      >
        <Link
          href="/"
          className="flex h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground"
        >
          Discover missions
        </Link>
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visible.map((id) => (
        <li key={id}>{byId.get(id)}</li>
      ))}
    </ul>
  );
}
