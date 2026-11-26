import { MapPin } from "lucide-react";
import { REGIONS } from "@/lib/taxonomy";

/**
 * "Find missions near you" (design update §8). Country / province-state / city via a
 * GET form: no GPS, no JavaScript. Radius is omitted until listings carry coordinates.
 */
export function LocationPicker({
  action,
  value,
  hidden,
}: {
  action: string;
  value: { country?: string; region?: string; city?: string };
  hidden?: Record<string, string | undefined>;
}) {
  const field =
    "h-11 w-full min-w-0 rounded-xl border bg-background px-3 text-sm text-foreground focus:border-emerald focus:outline-none";
  return (
    <section aria-labelledby="near-title" className="rounded-2xl border bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info/15 text-info">
          <MapPin className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="near-title" className="text-[15px] font-semibold">
            Find missions near you
          </h2>
          <p className="text-sm text-text-2">Select your city or region.</p>
        </div>
      </div>
      <form action={action} method="get" className="grid gap-2 sm:grid-cols-[1fr_1.4fr_1.4fr_auto]">
        {Object.entries(hidden ?? {}).map(([k, v]) =>
          v ? <input key={k} type="hidden" name={k} value={v} /> : null,
        )}
        <label className="flex flex-col gap-1 text-xs text-text-2">
          Country
          <select name="country" defaultValue={value.country ?? ""} className={field}>
            <option value="">Any</option>
            <option value="CA">Canada</option>
            <option value="US">United States</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-2">
          Province or state
          <select name="region" defaultValue={value.region ?? ""} className={field}>
            <option value="">Any</option>
            <optgroup label="Canada">
              {REGIONS.CA.map((r) => (
                <option key={`CA-${r.code}`} value={r.code}>
                  {r.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="United States">
              {REGIONS.US.map((r) => (
                <option key={`US-${r.code}`} value={r.code}>
                  {r.name}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-2">
          City (optional)
          <input
            name="city"
            defaultValue={value.city ?? ""}
            maxLength={60}
            placeholder="e.g. Toronto"
            className={field}
          />
        </label>
        <button
          type="submit"
          className="h-11 self-end rounded-xl bg-action px-5 text-sm font-semibold text-action-foreground hover:bg-action/80"
        >
          Search area
        </button>
      </form>
    </section>
  );
}
