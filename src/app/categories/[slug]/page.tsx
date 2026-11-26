import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AffiliateNotice } from "@/components/site/affiliate-notice";
import { CategoryIcon } from "@/components/site/category-icon";
import { OpportunityCard } from "@/components/site/opportunity-card";
import { getCategoryWithOpportunities } from "@/db/queries/public";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCategoryWithOpportunities((await params).slug);
  return data
    ? {
        title: data.category.name,
        description: data.category.description ?? undefined,
      }
    : {};
}

export default async function CategoryPage({ params }: Props) {
  const data = await getCategoryWithOpportunities((await params).slug);
  if (!data) notFound();
  const { category, items } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <CategoryIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="mt-1 text-muted-foreground">{category.description}</p>
          )}
        </div>
      </header>
      {items.length > 0 ? (
        <>
          <AffiliateNotice className="mb-6" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((o) => (
              <li key={o.id}>
                <OpportunityCard {...o} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No listings in this category yet. We only list providers we have an
          approved partnership with.
        </p>
      )}
    </div>
  );
}
