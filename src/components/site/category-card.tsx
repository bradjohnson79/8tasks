import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CategoryIcon } from "./category-icon";

type Props = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  opportunityCount: number;
};

export function CategoryCard({
  slug,
  name,
  description,
  icon,
  opportunityCount,
}: Props) {
  return (
    <Link
      href={`/categories/${slug}`}
      className="group flex h-full flex-row items-start gap-4 rounded-2xl border bg-card p-4 sm:flex-col sm:p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <CategoryIcon name={icon} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 self-stretch">
        <span className="font-semibold leading-snug">{name}</span>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
        <span className="mt-auto flex items-center justify-between pt-1 text-sm sm:pt-3">
          <span className="text-muted-foreground">
            {opportunityCount > 0
              ? `${opportunityCount} listing${opportunityCount === 1 ? "" : "s"}`
              : "Listings coming soon"}
          </span>
          <ArrowRightIcon
            className="size-4 text-primary transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </span>
    </Link>
  );
}
