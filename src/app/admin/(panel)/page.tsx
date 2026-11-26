import Link from "next/link";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { categories, opportunities, outboundClicks, providers } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const { db } = await requireAdminPage();
  const since = sql`now() - interval '30 days'`;
  const [[prov], [published], [opps], [cats], [clicks]] = await Promise.all([
    db.select({ n: count() }).from(providers),
    db.select({ n: count() }).from(providers).where(eq(providers.status, "published")),
    db.select({ n: count() }).from(opportunities).where(eq(opportunities.status, "published")),
    db.select({ n: count() }).from(categories).where(eq(categories.isActive, true)),
    db
      .select({ n: count() })
      .from(outboundClicks)
      .where(and(gte(outboundClicks.clickedAt, since), eq(outboundClicks.isBot, false))),
  ]);

  const tiles = [
    {
      label: "Providers",
      value: prov.n,
      note: `${published.n} published`,
      href: "/admin/providers",
    },
    {
      label: "Published opportunities",
      value: opps.n,
      note: "Visible on the site",
      href: "/admin/opportunities",
    },
    {
      label: "Active categories",
      value: cats.n,
      note: "Shown on the homepage",
      href: "/admin/categories",
    },
    {
      label: "Outbound clicks",
      value: clicks.n,
      note: "Last 30 days, bots excluded",
      href: "/admin/providers",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Real counts from the database. Demo rows are included outside production.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} className="block h-full">
              <Card className="h-full gap-1 transition-colors hover:border-primary/40">
                <CardDescription>{t.label}</CardDescription>
                <CardTitle className="text-3xl tabular-nums">{t.value}</CardTitle>
                <CardDescription>{t.note}</CardDescription>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <Card>
        <CardTitle>Getting a provider live</CardTitle>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>
            Add the provider (countries: Canada and/or US) and record what its affiliate program
            supports.
          </li>
          <li>Add its approved affiliate link (https only).</li>
          <li>Add an opportunity in the right category, attach the link, and publish both.</li>
        </ol>
      </Card>
    </div>
  );
}
