import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { FormMessage } from "@/components/admin/form-message";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, opportunities, providers } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Opportunities" };

export default async function AdminOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const rows = await db
    .select({
      id: opportunities.id,
      title: opportunities.title,
      status: opportunities.status,
      isDemo: opportunities.isDemo,
      isSponsored: opportunities.isSponsored,
      countries: opportunities.countries,
      provider: providers.name,
      category: categories.name,
      hasLink: sql<boolean>`${opportunities.affiliateLinkId} is not null`,
    })
    .from(opportunities)
    .innerJoin(providers, eq(providers.id, opportunities.providerId))
    .innerJoin(categories, eq(categories.id, opportunities.categoryId))
    .orderBy(asc(categories.sortOrder), asc(providers.name), asc(opportunities.title));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Opportunities</h1>
        <Button asChild>
          <Link href="/admin/opportunities/new">
            <PlusIcon /> Add opportunity
          </Link>
        </Button>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No opportunities yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Countries</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/opportunities/${r.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {r.isDemo && <Badge variant="warning">Demo</Badge>}
                      {r.isSponsored && <Badge variant="secondary">Sponsored</Badge>}
                      {!r.hasLink && <Badge variant="warning">No link</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.provider}</td>
                  <td className="px-4 py-3">{r.category}</td>
                  <td className="px-4 py-3">{r.countries.join(" · ") || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
