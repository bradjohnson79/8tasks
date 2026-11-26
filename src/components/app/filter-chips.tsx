import Link from "next/link";
import { cn } from "@/lib/utils";

export type Chip = {
  id: string;
  label: string;
  href: string;
  active: boolean;
  /** Disabled chips have no matching data (design spec §13: only enable what data supports). */
  disabled?: boolean;
  disabledHint?: string;
};

const base =
  "inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-sm font-medium whitespace-nowrap transition-colors";

/** Horizontally scrollable chip row (links, so it works without JavaScript). */
export function FilterChips({ chips, label }: { chips: Chip[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 sm:mx-0">
      <ul className="scroll-row relative flex gap-2 overflow-x-auto px-4 pb-1 sm:flex-wrap sm:overflow-visible sm:px-0">
        {chips.map((c) => (
          <li key={c.id} className="shrink-0">
            {c.disabled ? (
              <span
                aria-disabled="true"
                title={c.disabledHint ?? "No listings match this yet"}
                className={cn(
                  base,
                  "cursor-not-allowed border-transparent bg-surface/60 text-text-2/60",
                )}
              >
                {c.label}
                <span className="sr-only">
                  {" "}
                  (unavailable: {c.disabledHint ?? "no listings match yet"})
                </span>
              </span>
            ) : (
              <Link
                href={c.href}
                scroll={false}
                aria-current={c.active ? "true" : undefined}
                className={cn(
                  base,
                  c.active
                    ? "border-emerald/30 bg-action text-action-foreground"
                    : "border-border bg-surface text-text-2 hover:border-text-2/40 hover:text-foreground",
                )}
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
