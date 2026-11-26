import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";

/**
 * My Daily 8 entry point (design spec §11). Personalised recommendations need user
 * accounts (not yet approved), so guests see the "personalise" message. Never shows
 * invented totals or claims eight missions exist.
 */
export function Daily8Card() {
  return (
    <Link
      href="/daily-8"
      className="group flex items-center gap-4 rounded-2xl border border-emerald/15 bg-daily8 p-4 transition-colors hover:border-emerald/40"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald/10 text-emerald">
        <Sparkles className="size-6" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">My Daily 8</span>
        <span className="block text-sm text-text-2">Personalize your daily missions.</span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-text-2 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald"
        aria-hidden
      />
    </Link>
  );
}
