import Link from "next/link";
import { categoryDisplay } from "@/lib/taxonomy";

export type CategoryTileData = { slug: string; name: string };

/** Icon tile with short label; full name is the accessible name (design spec §12). */
export function CategoryTile({ category }: { category: CategoryTileData }) {
  const d = categoryDisplay(category.slug);
  const Icon = d.icon;
  return (
    <Link
      href={`/categories/${category.slug}`}
      aria-label={category.name}
      title={category.name}
      className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-transparent bg-surface px-1 py-3 text-center transition-colors hover:border-border hover:bg-elevated"
    >
      <span
        className="grid size-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
        style={{ backgroundColor: `${d.accent}1a`, color: d.accent }}
      >
        <Icon className="size-[22px]" aria-hidden />
      </span>
      <span className="w-full truncate px-0.5 text-xs font-medium sm:text-[13px] lg:line-clamp-2 lg:whitespace-normal lg:leading-tight">
        <span className="lg:hidden">{d.shortName}</span>
        <span className="hidden lg:inline">{category.name}</span>
      </span>
    </Link>
  );
}

/** 4×2 on mobile, 8 in a row on desktop. */
export function CategoryGrid({ categories }: { categories: CategoryTileData[] }) {
  return (
    <ul className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
      {categories.map((c) => (
        <li key={c.slug}>
          <CategoryTile category={c} />
        </li>
      ))}
    </ul>
  );
}
