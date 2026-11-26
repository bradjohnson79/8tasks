import { and, eq, inArray, sql } from "drizzle-orm";
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
import { providerPublishBlocker } from "@/lib/publish-policy";
import type { ImportProvider } from "./provider-import";

/**
 * Database side of the provider/listings import. Runs as app_admin inside the caller's
 * transaction (all or nothing). Idempotent: providers match on slug, links on
 * (provider, exact URL), opportunities on (provider, slug).
 *  - New records start as draft, except listings-package affiliate rows marked published that
 *    pass the publish policy. Free listings are always draft.
 *  - Existing records NEVER get their status or admin notes changed (founder edits in /admin
 *    win), and existing internal facts are only filled in where empty. The one exception is
 *    the explicit `publishAffiliate` option, which publishes affiliate rows marked published.
 */
type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Resolves every slug the import references; returns errors for unknown ones. */
export async function importLookups(db: Db | Tx, list: ImportProvider[]) {
  // Sequential: these may run on one transaction client.
  const cats = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const subs = await db
    .select({
      id: subcategories.id,
      slug: subcategories.slug,
      categoryId: subcategories.categoryId,
    })
    .from(subcategories);
  const groups = await db
    .select({ id: discoveryGroups.id, slug: discoveryGroups.slug, kind: discoveryGroups.kind })
    .from(discoveryGroups)
    .where(inArray(discoveryGroups.kind, ["subsection", "pathway"]));
  const existing = list.length
    ? await db
        .select()
        .from(providers)
        .where(
          inArray(
            providers.slug,
            list.map((p) => p.slug),
          ),
        )
    : [];
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
        if (!groups.some((x) => x.kind === "subsection" && x.slug === g))
          errors.push(`${where}: unknown subsection "${g}"`);
      for (const g of o.pathways)
        if (!groups.some((x) => x.kind === "pathway" && x.slug === g))
          errors.push(`${where}: unknown pathway "${g}"`);
    }
  return { catId, subId, groups, existing, errors };
}

type Lookups = Awaited<ReturnType<typeof importLookups>>;

export type ApplyOptions = { publishAffiliate?: boolean };
export type ApplyCounts = {
  created: number;
  updated: number;
  opps: number;
  oppsCreated: number;
  linksCreated: number;
  published: number;
  audit: number;
  blocked: string[];
};

const filled = (v: unknown) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length);

export async function applyProviders(
  tx: Tx,
  list: ImportProvider[],
  l: Lookups,
  actorUserId: string | null,
  opts: ApplyOptions = {},
): Promise<ApplyCounts> {
  const c: ApplyCounts = {
    created: 0,
    updated: 0,
    opps: 0,
    oppsCreated: 0,
    linksCreated: 0,
    published: 0,
    audit: 0,
    blocked: [],
  };
  const log = async (
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) => {
    c.audit++;
    await tx.insert(adminAuditLog).values({
      actorUserId: actorUserId as string,
      action,
      entityType,
      entityId,
      before: (before ?? null) as never,
      after: (after ?? null) as never,
    });
  };

  const adopted = new Set<string>();
  for (const p of list) {
    const caps = p.internal.capabilities ?? {};
    const values = {
      slug: p.slug,
      name: p.public.name,
      websiteUrl: p.public.website_url,
      summary: p.public.summary,
      description: p.public.description,
      countries: [...new Set(p.public.countries)].sort(),
      lastVerifiedAt: p.public.last_verified_at,
      ...(p.internal.affiliate_network ? { affiliateNetwork: p.internal.affiliate_network } : {}),
    };
    const [before] = await tx.select().from(providers).where(eq(providers.slug, p.slug));
    // Capabilities: only replace "unknown" (never downgrade a fact set in /admin).
    const capSet = Object.fromEntries(
      (
        [
          ["supportsSubIds", caps.supports_sub_ids],
          ["supportsPostbacks", caps.supports_postbacks],
          ["providesFeed", caps.provides_feed],
          ["allowsRevenueShare", caps.allows_revenue_share],
        ] as const
      ).filter(([k, v]) => v && v !== "unknown" && (!before || before[k] === "unknown")),
    );
    const [prov] = before
      ? await tx
          .update(providers)
          .set({ ...values, ...capSet })
          .where(eq(providers.id, before.id))
          .returning()
      : await tx
          .insert(providers)
          .values({
            ...values,
            ...capSet,
            status: "draft",
            adminNotes: p.internal.admin_notes,
          })
          .returning();
    if (before) c.updated++;
    else c.created++;

    // Internal (admin-only) facts: insert, or fill only the fields that are still empty.
    const incoming = {
      commissionModel:
        p.internal.commission_model === "unknown" ? null : p.internal.commission_model,
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
    const [intBefore] = await tx
      .select()
      .from(providerInternal)
      .where(eq(providerInternal.providerId, prov.id));
    let internalRow;
    if (!intBefore) {
      [internalRow] = await tx
        .insert(providerInternal)
        .values({
          providerId: prov.id,
          ...Object.fromEntries(Object.entries(incoming).filter(([, v]) => filled(v))),
          userValueListing: p.internal.user_value_listing,
        })
        .returning();
    } else {
      const fill: Record<string, unknown> = Object.fromEntries(
        Object.entries(incoming).filter(
          ([k, v]) =>
            filled(v) &&
            (!filled(intBefore[k as keyof typeof intBefore]) ||
              (k === "commissionModel" && intBefore.commissionModel === "unknown")),
        ),
      );
      if (p.internal.user_value_listing && !intBefore.userValueListing)
        fill.userValueListing = true;
      [internalRow] = Object.keys(fill).length
        ? await tx
            .update(providerInternal)
            .set(fill)
            .where(eq(providerInternal.providerId, prov.id))
            .returning()
        : [intBefore];
    }

    // Outbound link: reuse an identical existing link, otherwise add one (exact URL, no edits).
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
      if (existing) linkId = existing.id;
      else {
        const [link] = await tx
          .insert(affiliateLinks)
          .values({
            providerId: prov.id,
            label: p.public.affiliate_label ?? "Imported",
            destinationUrl: p.public.affiliate_url,
            subidParam: null,
            isAffiliate: p.public.affiliate_is_affiliate,
            adminNotes: p.public.affiliate_notes,
          })
          .returning();
        linkId = link.id;
        c.linksCreated++;
        await log("import.link_create", "affiliate_link", link.id, null, link);
      }
    }

    // Publishing: new affiliate rows marked published, or all of them with publishAffiliate.
    const wantsPublish = p.listing?.type === "affiliate" && p.listing.status === "published";
    let publishProvider = wantsPublish && (opts.publishAffiliate || !before);
    if (publishProvider) {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(affiliateLinks)
        .where(
          and(
            eq(affiliateLinks.providerId, prov.id),
            eq(affiliateLinks.isActive, true),
            eq(affiliateLinks.isAffiliate, true),
          ),
        );
      const blocker = providerPublishBlocker({
        readinessLevel: internalRow?.readinessLevel ?? null,
        userValueListing: internalRow?.userValueListing ?? false,
        activeAffiliateLinks: n,
      });
      if (blocker || !linkId) {
        c.blocked.push(`${p.slug}: ${blocker ?? "no outbound link"}`);
        publishProvider = false;
      } else if (prov.status !== "published") {
        await tx.update(providers).set({ status: "published" }).where(eq(providers.id, prov.id));
        c.published++;
        await log(
          "import.publish",
          "provider",
          prov.id,
          { status: prov.status },
          {
            status: "published",
          },
        );
      }
    }

    for (const o of p.public.opportunities) {
      const categoryId = l.catId(o.category)!;
      const oValues = {
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
        eligibility: o.eligibility,
        lastVerifiedAt: o.last_verified_at ?? p.public.last_verified_at,
        isDemo: false,
        isSponsored: false,
      };
      // Match on (provider, slug). If the slug changed between packages, adopt the provider's
      // existing provider-level listing in the same category instead of duplicating it.
      const mine = await tx
        .select()
        .from(opportunities)
        .where(eq(opportunities.providerId, prov.id));
      const importSlugs = new Set(p.public.opportunities.map((x) => x.slug));
      const oBefore =
        mine.find((x) => x.slug === o.slug) ??
        mine.find(
          (x) =>
            !importSlugs.has(x.slug) &&
            !adopted.has(x.id) &&
            x.categoryId === categoryId &&
            x.dataSource === "provider_level" &&
            !x.isDemo,
        );
      if (oBefore) adopted.add(oBefore.id);
      // Listings package: merge known attributes (absent = unknown, never "false") and keep
      // existing eligibility notes when the package has none.
      if (p.listing && oBefore) {
        oValues.attributes = { ...(oBefore.attributes ?? {}), ...o.attributes };
        if (!o.eligibility.length) oValues.eligibility = oBefore.eligibility;
      }
      const status: "draft" | "published" | "archived" = publishProvider
        ? "published"
        : (oBefore?.status ?? "draft");
      const [op] = oBefore
        ? await tx
            .update(opportunities)
            .set({ ...oValues, status })
            .where(eq(opportunities.id, oBefore.id))
            .returning()
        : await tx
            .insert(opportunities)
            .values({ ...oValues, status })
            .returning();
      c.opps++;
      if (!oBefore) c.oppsCreated++;
      if (status === "published" && oBefore?.status !== "published") c.published++;
      await log(
        oBefore ? "import.opportunity_update" : "import.opportunity_create",
        "opportunity",
        op.id,
        oBefore ?? null,
        op,
      );
      // Native/package imports describe the full placement set, so they replace it. The listings
      // package only names extra placements: add them and keep everything set in /admin.
      if (!p.listing) {
        await tx
          .delete(opportunityCategories)
          .where(eq(opportunityCategories.opportunityId, op.id));
        await tx.delete(opportunityGroups).where(eq(opportunityGroups.opportunityId, op.id));
      }
      const secondary = o.secondary.map((s) => ({
        opportunityId: op.id,
        categoryId: l.catId(s.category)!,
        subcategoryId: s.subcategory ? (l.subId(s.category, s.subcategory) ?? null) : null,
      }));
      if (secondary.length)
        await tx.insert(opportunityCategories).values(secondary).onConflictDoNothing();
      const groups = [
        ...o.subsections.map((g) => l.groups.find((x) => x.kind === "subsection" && x.slug === g)!),
        ...o.pathways.map((g) => l.groups.find((x) => x.kind === "pathway" && x.slug === g)!),
      ].map((g) => ({ opportunityId: op.id, groupId: g.id }));
      if (groups.length) await tx.insert(opportunityGroups).values(groups).onConflictDoNothing();
    }
    await log(
      before ? "import.provider_update" : "import.provider_create",
      "provider",
      prov.id,
      before ?? null,
      { ...prov, opportunities: p.public.opportunities.map((o) => o.slug) },
    );
  }
  return c;
}
