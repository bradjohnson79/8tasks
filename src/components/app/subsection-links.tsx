import Link from "next/link";
import type { DiscoveryGroup } from "@/lib/discovery/defaults";
import { discoveryIcon } from "@/lib/discovery/icons";

/** Compact links to the /earn subsections (category pages and search; not the homepage). */
export function SubsectionLinks({
  subsections,
  title = "Creative ways to earn",
}: {
  subsections: DiscoveryGroup[];
  title?: string;
}) {
  if (!subsections.length) return null;
  return (
    <nav aria-label={title} className="flex flex-col gap-2">
      <p className="text-sm font-medium text-text-2">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {subsections.map((s) => {
          const Icon = discoveryIcon(s.icon);
          return (
            <li key={s.slug}>
              <Link
                href={`/earn/${s.slug}`}
                className="flex min-h-11 items-center gap-2 rounded-full border bg-surface px-4 text-sm hover:border-emerald"
              >
                <Icon className="size-4" style={{ color: s.accent }} aria-hidden />
                {s.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
