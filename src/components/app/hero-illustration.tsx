import { Camera, Check, ClipboardList, Search, ShoppingBag, Smartphone } from "lucide-react";
import { categoryDisplay } from "@/lib/taxonomy";

/**
 * Hero artwork (founder-approved exception, 2026-11-26: the only graphic on the site).
 * A phone browsing mission categories, with a survey card and a usability-test checklist
 * beside it. Static (no floating motion, per design spec §22), design-system colours,
 * and no payouts, earnings or counts (CLAUDE.md rule 1). Decorative: aria-hidden.
 */
const ROWS = [
  { slug: "surveys", icon: ClipboardList, label: "Surveys" },
  { slug: "app-website-testing", icon: Smartphone, label: "App & Website Testing" },
  { slug: "photography", icon: Camera, label: "Photography" },
  { slug: "mystery-shopping", icon: ShoppingBag, label: "Mystery Shopping" },
];

const bar = "block h-1.5 rounded-full bg-text-2/25";

export function HeroIllustration() {
  return (
    <div aria-hidden className="relative mx-auto h-[440px] w-[440px] select-none">
      {/* Phone */}
      <div className="absolute top-0 right-6 h-[440px] w-[220px] rounded-[2.25rem] border border-border bg-surface p-2 shadow-2xl shadow-black/40">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-background">
          <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-black/60" />
          <div className="flex items-baseline px-4 pt-3 text-sm font-bold">
            <span className="text-emerald">8</span>
            <span>Tasks</span>
          </div>
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border bg-surface px-2.5 py-2">
            <Search className="size-3 text-text-2" />
            <span className={`${bar} w-24`} />
          </div>
          <ul className="mt-3 flex flex-col gap-2 px-3">
            {ROWS.map(({ slug, icon: Icon, label }, i) => {
              const accent = categoryDisplay(slug).accent;
              return (
                <li
                  key={slug}
                  className={`flex items-center gap-2.5 rounded-xl border p-2.5 ${i === 1 ? "border-emerald/40 bg-elevated" : "border-transparent bg-surface"}`}
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-lg"
                    style={{ backgroundColor: `${accent}1f`, color: accent }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium">{label}</span>
                    <span className={`${bar} mt-1 w-14`} />
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-auto px-3 pb-4">
            <div className="rounded-xl bg-action py-2 text-center text-[11px] font-semibold text-action-foreground">
              Explore Mission
            </div>
          </div>
        </div>
      </div>

      {/* Survey card */}
      <div className="absolute top-14 left-6 w-44 rounded-2xl border bg-elevated p-3 shadow-xl shadow-black/30">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-info uppercase">
          <ClipboardList className="size-3" /> Survey
        </div>
        <span className={`${bar} mb-2.5 w-28`} />
        {[true, false, false].map((selected, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <span
              className={`grid size-3.5 place-items-center rounded-full border ${selected ? "border-emerald bg-emerald" : "border-text-2/50"}`}
            >
              {selected && <span className="size-1.5 rounded-full bg-background" />}
            </span>
            <span className={`${bar} ${i === 1 ? "w-14" : "w-20"}`} />
          </div>
        ))}
      </div>

      {/* Usability-test checklist */}
      <div className="absolute bottom-14 left-0 w-48 rounded-2xl border bg-elevated p-3 shadow-xl shadow-black/30">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#A99BFA] uppercase">
          <Smartphone className="size-3" /> Usability test
        </div>
        {[true, true, false].map((done, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <span
              className={`grid size-3.5 place-items-center rounded-[5px] ${done ? "bg-emerald text-background" : "border border-text-2/50"}`}
            >
              {done && <Check className="size-2.5" strokeWidth={3} />}
            </span>
            <span className={`${bar} ${i === 2 ? "w-16" : "w-24"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
