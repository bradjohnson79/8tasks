import Link from "next/link";
import { asc, count, eq, sql } from "drizzle-orm";
import { PlusIcon } from "lucide-react";
import { FormMessage } from "@/components/admin/form-message";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { opportunities, providers } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Providers" };

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const rows = await db
    .select({
      id: providers.id,
      name: providers.name,
      slug: providers.slug,
      status: providers.status,
      countries: providers.countries,
      isDemo: providers.isDemo,
      links: sql<number>`(select count(*)::int from affiliate_links al where al.provider_id = "providers"."id" and al.is_active)`,
      opps: count(opportunities.id),
    })
    .from(providers)
    .leftJoin(opportunities, eq(opportunities.providerId, providers.id))
    .groupBy(providers.id)
    .orderBy(asc(providers.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Providers</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/import">Import listings</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/providers/new">
              <PlusIcon /> Add provider
            </Link>
          </Button>
        </div>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          No providers yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Countries</th>
                <th className="px-4 py-3 text-right font-medium">Active links</th>
                <th className="px-4 py-3 text-right font-medium">Opportunities</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/providers/${r.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.isDemo && (
                      <Badge variant="warning" className="ml-2">
                        Demo
                      </Badge>
                    )}
                    <div className="text-xs text-muted-foreground">/{r.slug}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">{r.countries.join(" · ") || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.links}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.opps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
