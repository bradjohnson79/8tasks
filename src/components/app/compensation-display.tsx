import { formatCompensation } from "@/lib/missions/compensation";
import type { Compensation } from "@/lib/missions/types";
import { cn } from "@/lib/utils";

/** Verified pay in bold emerald; non-amount terms in calmer text so cards stay balanced. */
export function CompensationDisplay({
  compensation,
  size = "card",
  className,
}: {
  compensation: Compensation;
  size?: "card" | "detail";
  className?: string;
}) {
  const d = formatCompensation(compensation);
  return (
    <div className={cn("text-right", className)}>
      <span className="sr-only">Compensation: {d.label}</span>
      <div aria-hidden>
        {d.isAmount ? (
          <p className="leading-none">
            <span
              className={cn(
                "font-bold tabular-nums text-emerald",
                size === "detail" ? "text-[28px]" : d.primary.length > 5 ? "text-xl" : "text-2xl",
              )}
            >
              {d.primary}
            </span>
            {d.unit && <span className="ml-1 text-xs font-medium text-text-2">{d.unit}</span>}
          </p>
        ) : (
          <p
            className={cn(
              "font-semibold leading-tight text-foreground",
              size === "detail" ? "text-lg" : "text-sm",
            )}
          >
            {d.primary}
          </p>
        )}
        {d.secondary && <p className="mt-1 text-xs leading-snug text-text-2">{d.secondary}</p>}
      </div>
    </div>
  );
}
