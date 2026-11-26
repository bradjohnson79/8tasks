import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

/**
 * Discovery search (design spec §10). A plain GET form to /missions, so it works
 * without client JavaScript. Results only ever include real listings (or labelled demo data).
 */
export function SearchBar({
  defaultValue,
  filtersHref = "/missions?panel=1#filters",
}: {
  defaultValue?: string;
  filtersHref?: string;
}) {
  return (
    <form action="/missions" method="get" role="search" className="flex items-center gap-2">
      <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border bg-surface px-4 transition-colors focus-within:border-emerald">
        <Search className="size-5 shrink-0 text-text-2" aria-hidden />
        <span className="sr-only">Search missions</span>
        <input
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder="What would you like to do?"
          autoComplete="off"
          enterKeyHint="search"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-foreground placeholder:text-text-2 focus:outline-none"
        />
      </label>
      <Link
        href={filtersHref}
        aria-label="Advanced filters"
        className="grid size-12 shrink-0 place-items-center rounded-xl border bg-surface text-text-2 transition-colors hover:border-emerald hover:text-emerald"
      >
        <SlidersHorizontal className="size-5" aria-hidden />
      </Link>
    </form>
  );
}
