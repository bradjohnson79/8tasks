import {
  CheckIcon,
  ClipboardListIcon,
  MonitorSmartphoneIcon,
  SearchIcon,
  ShoppingBagIcon,
  UsersIcon,
} from "lucide-react";

/**
 * Decorative hero artwork: a phone browsing mission categories, with a survey card
 * and a usability-test checklist floating beside it.
 * Intentionally shows no payouts, earnings or counts (CLAUDE.md rule 1).
 */
const ROWS = [
  { icon: ClipboardListIcon, label: "Surveys & Polls" },
  { icon: MonitorSmartphoneIcon, label: "App & Website Testing" },
  { icon: UsersIcon, label: "Paid Research" },
  { icon: ShoppingBagIcon, label: "Mystery Shopping" },
];

export function HeroIllustration() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-[440px] w-[440px] select-none"
    >
      {/* Phone */}
      <div className="hero-float absolute top-0 right-6 h-[440px] w-[220px] rounded-[2.25rem] border border-white/15 bg-navy-2 p-2 shadow-2xl shadow-black/40">
        <div className="flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-[#0e1830]">
          <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-black/60" />
          <div className="flex items-center gap-1.5 px-4 pt-3 text-sm font-semibold text-white">
            <span className="grid size-5 place-items-center rounded-md bg-mint text-[10px] font-bold text-navy">
              8
            </span>
            Missions
          </div>
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-2">
            <SearchIcon className="size-3 text-white/40" />
            <span className="h-1.5 w-20 rounded-full bg-white/15" />
          </div>
          <ul className="mt-3 flex flex-col gap-2 px-3">
            {ROWS.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className={`flex items-center gap-2.5 rounded-xl p-2.5 ${i === 1 ? "bg-mint/15 ring-1 ring-mint/40" : "bg-white/5"}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-mint/15 text-mint">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-medium text-white">
                    {label}
                  </span>
                  <span className="mt-1 block h-1 w-14 rounded-full bg-white/15" />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-auto px-3 pb-4">
            <div className="rounded-xl bg-mint py-2 text-center text-[11px] font-semibold text-navy">
              Visit provider
            </div>
          </div>
        </div>
      </div>

      {/* Floating survey card */}
      <div className="hero-float-delayed absolute top-14 left-6 w-44 rounded-2xl border border-white/10 bg-white p-3 text-navy shadow-xl shadow-black/30">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
          <ClipboardListIcon className="size-3" /> Survey
        </div>
        <span className="mb-2.5 block h-1.5 w-28 rounded-full bg-slate-200" />
        {[true, false, false].map((selected, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <span
              className={`grid size-3.5 place-items-center rounded-full border ${selected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}
            >
              {selected && <span className="size-1.5 rounded-full bg-white" />}
            </span>
            <span
              className={`h-1.5 rounded-full bg-slate-200 ${i === 1 ? "w-14" : "w-20"}`}
            />
          </div>
        ))}
      </div>

      {/* Floating usability-test checklist */}
      <div className="hero-float absolute bottom-14 left-0 w-48 rounded-2xl border border-white/10 bg-white p-3 text-navy shadow-xl shadow-black/30">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase">
          <MonitorSmartphoneIcon className="size-3" /> Usability test
        </div>
        {[true, true, false].map((done, i) => (
          <div key={i} className="mt-1.5 flex items-center gap-2">
            <span
              className={`grid size-3.5 place-items-center rounded-[5px] ${done ? "bg-emerald-600 text-white" : "border border-slate-300"}`}
            >
              {done && <CheckIcon className="size-2.5" strokeWidth={3} />}
            </span>
            <span
              className={`h-1.5 rounded-full ${done ? "bg-slate-300" : "bg-slate-200"} ${i === 2 ? "w-16" : "w-24"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
