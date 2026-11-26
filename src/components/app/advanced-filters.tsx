import { ADVANCED_GROUPS, FILTER_BY_ID, FILTER_GROUP_LABELS } from "@/lib/missions/filters";
import { cn } from "@/lib/utils";

/**
 * Grouped filters (design update §14) as a GET form: works without JavaScript.
 * Filters with no matching data are disabled, never silently applied.
 */
export function AdvancedFilters({
  action,
  active,
  available,
  hidden,
  open,
}: {
  action: string;
  active: string[];
  available: Set<string>;
  hidden: Record<string, string | undefined>;
  open: boolean;
}) {
  const count = active.filter((id) => id !== "for-you").length;
  return (
    <details id="filters" open={open} className="group scroll-mt-20 rounded-2xl border bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <span>
          All filters
          {count > 0 && (
            <span className="ml-2 rounded-full bg-action px-2 py-0.5 text-xs text-action-foreground">
              {count}
            </span>
          )}
        </span>
        <span className="text-text-2 transition-transform group-open:rotate-180" aria-hidden>
          ▾
        </span>
      </summary>
      <form action={action} method="get" className="flex flex-col gap-5 border-t px-4 py-4">
        {Object.entries(hidden).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
        {ADVANCED_GROUPS.map(({ group, ids }) => (
          <fieldset key={group}>
            <legend className="mb-2 text-xs font-semibold tracking-wide text-text-2 uppercase">
              {FILTER_GROUP_LABELS[group]}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ids.map((id) => {
                const f = FILTER_BY_ID[id];
                const enabled = available.has(id) || active.includes(id);
                return (
                  <label
                    key={id}
                    title={enabled ? undefined : (f.disabledHint ?? "No listings match this yet")}
                    className={cn(
                      "flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm has-[:checked]:border-emerald/40 has-[:checked]:bg-action has-[:checked]:text-action-foreground has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald",
                      enabled
                        ? "cursor-pointer bg-background text-text-2 hover:text-foreground"
                        : "cursor-not-allowed bg-background/40 text-text-2/50",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="f"
                      value={id}
                      defaultChecked={active.includes(id)}
                      disabled={!enabled}
                      className="sr-only"
                    />
                    {f.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 flex-1 rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action/80"
          >
            Show results
          </button>
          <a
            href={action}
            className="grid h-11 place-items-center rounded-xl border px-4 text-sm font-semibold text-text-2 hover:text-foreground"
          >
            Clear
          </a>
        </div>
        <p className="text-xs text-text-2">
          Filters only use verified listing details. Listings with unknown details aren&apos;t
          included.
        </p>
      </form>
    </details>
  );
}
