import Link from "next/link";
import type { DiscoveryGroup as Pathway } from "@/lib/discovery/defaults";
import { discoveryIcon } from "@/lib/discovery/icons";
import { cn } from "@/lib/utils";

/** "How do you want to earn?" tiles (design update §4–5): 2×2 on mobile, 4 across on desktop. */
export function PathwayTile({
  pathway,
  selected = false,
}: {
  pathway: Pathway;
  selected?: boolean;
}) {
  const Icon = discoveryIcon(pathway.icon);
  const accent = pathway.accent ?? "#53E6A0";
  return (
    <Link
      href={`/missions?path=${pathway.slug}`}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "group flex h-full min-h-[76px] items-center gap-3 rounded-2xl border bg-surface p-3 transition-colors hover:border-[color:var(--accent-color)] sm:p-4",
        selected && "border-[color:var(--accent-color)] bg-elevated",
      )}
      style={{ "--accent-color": accent } as React.CSSProperties}
    >
      <span
        className="grid size-10 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight sm:text-[15px]">
          {pathway.title}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-2 sm:text-[13px]">
          {pathway.description}
        </span>
      </span>
    </Link>
  );
}

export function PathwayGrid({ pathways, selected }: { pathways: Pathway[]; selected?: string }) {
  return (
    <ul className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
      {pathways.map((p) => (
        <li key={p.slug}>
          <PathwayTile pathway={p} selected={p.slug === selected} />
        </li>
      ))}
    </ul>
  );
}
