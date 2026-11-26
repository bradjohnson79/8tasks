import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { ExternalLinkIcon, PlusIcon } from "lucide-react";
import { CheckboxField, SelectField, TextField } from "@/components/admin/fields";
import { SUBID_PARAMS } from "@/lib/redirect/subid";
import { FormMessage } from "@/components/admin/form-message";
import { ProviderForm } from "@/components/admin/provider-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  affiliateLinks,
  categories,
  opportunities,
  providerInternal,
  providers,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { saveAffiliateLink, saveProvider } from "../../../actions";

export const metadata = { title: "Edit provider" };

export default async function EditProviderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  const [internal] = await db
    .select()
    .from(providerInternal)
    .where(eq(providerInternal.providerId, id));
  if (!provider) notFound();

  const [links, opps] = await Promise.all([
    db
      .select({
        id: affiliateLinks.id,
        label: affiliateLinks.label,
        destinationUrl: affiliateLinks.destinationUrl,
        isActive: affiliateLinks.isActive,
        subidParam: affiliateLinks.subidParam,
        adminNotes: affiliateLinks.adminNotes,
        isDemo: affiliateLinks.isDemo,
        clicks30d: sql<number>`(select count(*)::int from outbound_clicks oc where oc.affiliate_link_id = "affiliate_links"."id" and not oc.is_bot and oc.clicked_at >= now() - interval '30 days')`,
      })
      .from(affiliateLinks)
      .where(eq(affiliateLinks.providerId, id))
      .orderBy(asc(affiliateLinks.createdAt)),
    db
      .select({
        id: opportunities.id,
        title: opportunities.title,
        status: opportunities.status,
        category: categories.name,
        hasLink: sql<boolean>`${opportunities.affiliateLinkId} is not null`,
      })
      .from(opportunities)
      .innerJoin(categories, eq(categories.id, opportunities.categoryId))
      .where(eq(opportunities.providerId, id))
      .orderBy(asc(opportunities.title)),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Link
          href="/admin/providers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Providers
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{provider.name}</h1>
          <StatusBadge status={provider.status} />
          {provider.isDemo && <Badge variant="warning">Demo</Badge>}
          {provider.status === "published" && (
            <Link
              href={`/providers/${provider.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
            >
              View on site <ExternalLinkIcon className="size-3.5" />
            </Link>
          )}
        </div>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />

      <ProviderForm
        action={saveProvider.bind(null, provider.id)}
        provider={provider}
        internal={internal ?? null}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Affiliate links</h2>
          <p className="text-sm text-muted-foreground">
            The only places /go can send visitors. Paste the exact tracking URL from the provider or
            network (https only).
          </p>
        </div>
        {links.map((l) => (
          <AdminForm
            key={l.id}
            action={saveAffiliateLink.bind(null, provider.id, l.id)}
            className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[1fr_2fr]"
          >
            <TextField
              idPrefix={`l-${l.id}`}
              name="label"
              label="Label"
              defaultValue={l.label}
              required
            />
            <TextField
              idPrefix={`l-${l.id}`}
              name="destinationUrl"
              label="Tracking URL"
              defaultValue={l.destinationUrl}
              required
            />
            <SelectField
              idPrefix={`l-${l.id}`}
              name="subidParam"
              label="SubID parameter"
              defaultValue={l.subidParam}
              options={[...SUBID_PARAMS]}
              placeholder="None (use link exactly as stored)"
              hint="Only for network links with a documented SubID. Leave None for direct programs."
            />
            <TextField
              idPrefix={`l-${l.id}`}
              name="adminNotes"
              label="Notes (private)"
              defaultValue={l.adminNotes}
            />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <CheckboxField
                idPrefix={`l-${l.id}`}
                name="isActive"
                label="Active"
                defaultChecked={l.isActive}
              />
              <span className="text-sm text-muted-foreground tabular-nums">
                {l.clicks30d} clicks (30 days){l.isDemo ? " · demo" : ""}
              </span>
              <Button type="submit" variant="outline" size="sm">
                Save link
              </Button>
            </div>
          </AdminForm>
        ))}
        <AdminForm
          action={saveAffiliateLink.bind(null, provider.id, null)}
          className="grid gap-4 rounded-2xl border border-dashed p-4 sm:grid-cols-[1fr_2fr]"
        >
          <TextField
            idPrefix="new-link"
            name="label"
            label="Label"
            placeholder="e.g. Main sign-up link"
            required
          />
          <TextField
            idPrefix="new-link"
            name="destinationUrl"
            label="Tracking URL"
            placeholder="https://"
            required
          />
          <SelectField
            idPrefix="new-link"
            name="subidParam"
            label="SubID parameter"
            options={[...SUBID_PARAMS]}
            placeholder="None (use link exactly as stored)"
            hint="Only for network links with a documented SubID."
          />
          <input type="hidden" name="isActive" value="on" />
          <div className="sm:col-span-2">
            <Button type="submit" size="sm">
              <PlusIcon /> Add link
            </Button>
          </div>
        </AdminForm>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Opportunities</h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/opportunities/new?providerId=${provider.id}`}>
              <PlusIcon /> Add opportunity
            </Link>
          </Button>
        </div>
        {opps.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-2xl border bg-card">
            {opps.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <Link
                  href={`/admin/opportunities/${o.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {o.title}
                </Link>
                <span className="text-muted-foreground">{o.category}</span>
                <StatusBadge status={o.status} />
                {!o.hasLink && <Badge variant="warning">No link</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
