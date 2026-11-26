import { and, eq, inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  adminAuditLog,
  affiliateLinks,
  categories,
  discoveryGroups,
  opportunities,
  opportunityCategories,
  opportunityGroups,
  providerInternal,
  providers,
  subcategories,
} from "@/db/schema";
import type * as schema from "@/db/schema";
import type { ImportProvider } from "./provider-import";

/**
 * Database side of the provider import. Runs as app_admin inside the caller's transaction.
 * Every provider and opportunity is written as status = draft (never published here).
 */
type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Resolves every slug the import references; returns errors for unknown ones. */
export async function importLookups(db: Db | Tx, list: ImportProvider[]) {
  const [cats, subs, groups, existing] = await Promise.all([
    db.select({ id: categories.id, slug: categories.slug }).from(categories),
    db
      .select({
        id: subcategories.id,
        slug: subcategories.slug,
        categoryId: subcategories.categoryId,
      })
      .from(subcategories),
    db
      .select({ id: discoveryGroups.id, slug: discoveryGroups.slug })
      .from(discoveryGroups)
      .where(eq(discoveryGroups.kind, "subsection")),
    db
      .select()
      .from(providers)
      .where(
        inArray(
          providers.slug,
          list.map((p) => p.slug),
        ),
      ),
  ]);
  const catId = (s: string) => cats.find((c) => c.slug === s)?.id;
  const subId = (cat: string, s: string) => {
    const c = catId(cat);
    return subs.find((x) => x.slug === s && x.categoryId === c)?.id;
  };
  const errors: string[] = [];
  for (const p of list)
    for (const o of p.public.opportunities) {
      const where = `${p.slug}/${o.slug}`;
      if (!catId(o.category)) errors.push(`${where}: unknown category "${o.category}"`);
      else if (o.subcategory && !subId(o.category, o.subcategory))
        errors.push(`${where}: unknown subcategory "${o.subcategory}" in ${o.category}`);
      for (const s of o.secondary) {
        if (!catId(s.category)) errors.push(`${where}: unknown secondary category "${s.category}"`);
        else if (s.subcategory && !subId(s.category, s.subcategory))
          errors.push(`${where}: unknown secondary subcategory "${s.category}/${s.subcategory}"`);
      }
      for (const g of o.subsections)
        if (!groups.some((x) => x.slug === g)) errors.push(`${where}: unknown subsection "${g}"`);
    }
  return { catId, subId, groups, existing, errors };
}

type Lookups = Awaited<ReturnType<typeof importLookups>>;

export async function applyProviders(
  tx: Tx,
  list: ImportProvider[],
  l: Lookups,
  actorUserId: string,
) {
  let created = 0;
  let updated = 0;
  let opps = 0;
  for (const p of list) {
    const values = {
      slug: p.slug,
      name: p.public.name,
      websiteUrl: p.public.website_url,
      summary: p.public.summary,
      description: p.public.description,
      countries: [...new Set(p.public.countries)].sort(),
      lastVerifiedAt: p.public.last_verified_at,
      status: "draft" as const, // never published by an import
    };
    const [before] = await tx.select().from(providers).where(eq(providers.slug, p.slug));
    const [prov] = before
      ? await tx.update(providers).set(values).where(eq(providers.id, before.id)).returning()
      : await tx.insert(providers).values(values).returning();
    if (before) updated++;
    else created++;

    const internal = {
      commissionModel: p.internal.commission_model,
      commissionText: p.internal.commission_text,
      commissionCurrency: p.internal.commission_currency?.toUpperCase() ?? null,
      qualifyingAction: p.internal.qualifying_action,
      trackingWindow: p.internal.tracking_window,
      recurringCommission: p.internal.recurring_commission,
      sourceUrls: p.internal.source_urls,
      readinessLevel: p.internal.readiness_level,
      approvalStatus: p.internal.approval_status,
      missionAlignment: p.internal.mission_alignment,
      businessContact: p.internal.business_contact,
    };
    await tx
      .insert(providerInternal)
      .values({ providerId: prov.id, ...internal })
      .onConflictDoUpdate({ target: providerInternal.providerId, set: internal });

    // Affiliate URL: reuse an identical existing link, otherwise add one (exact URL, no edits).
    let linkId: string | null = null;
    if (p.public.affiliate_url) {
      const [existing] = await tx
        .select({ id: affiliateLinks.id })
        .from(affiliateLinks)
        .where(
          and(
            eq(affiliateLinks.providerId, prov.id),
            eq(affiliateLinks.destinationUrl, p.public.affiliate_url),
          ),
        );
      linkId =
        existing?.id ??
        (
          await tx
            .insert(affiliateLinks)
            .values({
              providerId: prov.id,
              label: "Imported",
              destinationUrl: p.public.affiliate_url,
            })
            .returning({ id: affiliateLinks.id })
        )[0].id;
    }

    for (const o of p.public.opportunities) {
      const categoryId = l.catId(o.category)!;
      const values = {
        providerId: prov.id,
        categoryId,
        subcategoryId: o.subcategory ? (l.subId(o.category, o.subcategory) ?? null) : null,
        affiliateLinkId: linkId,
        slug: o.slug,
        title: o.title,
        summary: o.summary,
        description: o.description,
        countries: [...new Set(o.countries ?? p.public.countries)].sort(),
        compensationType: o.compensation_type,
        compensationNote: o.compensation_note,
        attributes: o.attributes,
        lastVerifiedAt: o.last_verified_at ?? p.public.last_verified_at,
        status: "draft" as const,
      };
      const [op] = await tx
        .insert(opportunities)
        .values(values)
        .onConflictDoUpdate({
          target: [opportunities.providerId, opportunities.slug],
          set: values,
        })
        .returning({ id: opportunities.id });
      opps++;
      await tx.delete(opportunityCategories).where(eq(opportunityCategories.opportunityId, op.id));
      await tx.delete(opportunityGroups).where(eq(opportunityGroups.opportunityId, op.id));
      const secondary = o.secondary.map((s) => ({
        opportunityId: op.id,
        categoryId: l.catId(s.category)!,
        subcategoryId: s.subcategory ? (l.subId(s.category, s.subcategory) ?? null) : null,
      }));
      if (secondary.length)
        await tx.insert(opportunityCategories).values(secondary).onConflictDoNothing();
      const groups = o.subsections.map((g) => ({
        opportunityId: op.id,
        groupId: l.groups.find((x) => x.slug === g)!.id,
      }));
      if (groups.length) await tx.insert(opportunityGroups).values(groups).onConflictDoNothing();
    }
    await tx.insert(adminAuditLog).values({
      actorUserId,
      action: before ? "import.provider_update" : "import.provider_create",
      entityType: "provider",
      entityId: prov.id,
      before: before ?? null,
      after: { ...prov, opportunities: p.public.opportunities.map((o) => o.slug) },
    });
  }
  return { created, updated, opps };
}
