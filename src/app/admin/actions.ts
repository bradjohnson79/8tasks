"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import {
  affiliateLinks,
  categories,
  opportunities,
  opportunityCategories,
  opportunityGroups,
  providerInternal,
  providers,
  subcategories,
} from "@/db/schema";
import { ATTRIBUTE_KEYS } from "@/lib/missions/types";
import { providerPublishBlocker } from "@/lib/publish-policy";
import { audit, requireAdmin } from "@/lib/admin";
import {
  affiliateLinkSchema,
  categorySchema,
  firstError,
  formToObject,
  attributesFromForm,
  membershipsFromForm,
  opportunityDetailsSchema,
  opportunitySchema,
  providerInternalSchema,
  providerSchema,
  subcategorySchema,
} from "@/lib/validation/admin";

/**
 * Admin mutations. Every action:
 *  1. calls requireAdmin() (server-side role + MFA check, CLAUDE.md rule 4),
 *  2. validates input with Zod,
 *  3. writes through the app_admin connection inside a transaction with an audit entry.
 * Records are archived/deactivated rather than deleted, to keep click history intact.
 * Public data pages render dynamically, so no cache revalidation is needed after a save.
 * (A site-wide revalidatePath("/", "layout") 404s the prerendered legal pages in Next 15.)
 */

type Result = { ok: true; id: string; message: string } | { ok: false; message: string };

export type ActionState = { error: string } | undefined;

type AdminTx = Parameters<
  Parameters<Awaited<ReturnType<typeof requireAdmin>>["db"]["transaction"]>[0]
>[0];

/** Failure: return the message so the form can show it without losing input. Success: redirect. */
function done(path: string, result: Result, successPath?: string): ActionState {
  if (!result.ok) return { error: result.message };
  redirect(`${successPath ?? path}?saved=${encodeURIComponent(result.message)}`);
}

function dbError(err: unknown): string {
  const e = err as {
    code?: string;
    constraint?: string;
    cause?: { code?: string; constraint?: string };
  };
  const code = e.code ?? e.cause?.code;
  const constraint = e.constraint ?? e.cause?.constraint ?? "";
  if (code === "23505")
    return `That slug is already used${constraint.includes("provider") ? " for this provider" : ""}. Pick another.`;
  if (code === "23514") return "A value failed a database check (URLs must start with https://).";
  if (code === "23503") return "A linked record no longer exists. Refresh and try again.";
  console.error(err);
  return "Something went wrong while saving. Nothing was changed.";
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
async function saveInternal(
  tx: AdminTx,
  providerId: string,
  internal: Omit<ReturnType<typeof providerInternalSchema.parse>, "lastVerifiedAt">,
) {
  await tx
    .insert(providerInternal)
    .values({ providerId, ...internal })
    .onConflictDoUpdate({ target: providerInternal.providerId, set: internal });
}
export async function saveProvider(providerId: string | null, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = providerId ? `/admin/providers/${providerId}` : "/admin/providers/new";
  const parsed = providerSchema.safeParse(formToObject(form, { arrays: ["countries"] }));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const internalParsed = providerInternalSchema.safeParse(
    formToObject(form, { booleans: ["userValueListing"] }),
  );
  if (!internalParsed.success) return { error: firstError(internalParsed.error) };
  const { lastVerifiedAt, ...internal } = internalParsed.data;
  const providerData = { ...parsed.data, lastVerifiedAt };

  if (providerData.status === "published") {
    const [{ n }] = providerId
      ? await db
          .select({ n: sql<number>`count(*)::int` })
          .from(affiliateLinks)
          .where(and(eq(affiliateLinks.providerId, providerId), eq(affiliateLinks.isActive, true)))
      : [{ n: 0 }];
    const blocker = providerPublishBlocker({
      readinessLevel: internal.readinessLevel,
      userValueListing: internal.userValueListing,
      activeAffiliateLinks: n,
    });
    if (blocker) return { error: blocker };
  }

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      if (providerId) {
        const [before] = await tx.select().from(providers).where(eq(providers.id, providerId));
        if (!before) return { ok: false as const, message: "Provider not found." };
        const [after] = await tx
          .update(providers)
          .set(providerData)
          .where(eq(providers.id, providerId))
          .returning();
        await saveInternal(tx, providerId, internal);
        await audit(tx, session.user.id, "provider.update", "provider", providerId, before, {
          ...after,
          internal,
        });
        return { ok: true as const, id: providerId, message: "Provider saved." };
      }
      const [created] = await tx.insert(providers).values(providerData).returning();
      await saveInternal(tx, created.id, internal);
      await audit(tx, session.user.id, "provider.create", "provider", created.id, null, {
        ...created,
        internal,
      });
      return {
        ok: true as const,
        id: created.id,
        message: "Provider created. Add its affiliate link below.",
      };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done(path, result, result.ok ? `/admin/providers/${result.id}` : undefined);
}

export async function saveAffiliateLink(providerId: string, linkId: string | null, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = `/admin/providers/${providerId}`;
  const parsed = affiliateLinkSchema.safeParse(formToObject(form, { booleans: ["isActive"] }));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      if (linkId) {
        const [before] = await tx
          .select()
          .from(affiliateLinks)
          .where(and(eq(affiliateLinks.id, linkId), eq(affiliateLinks.providerId, providerId)));
        if (!before) return { ok: false as const, message: "Link not found." };
        const [after] = await tx
          .update(affiliateLinks)
          .set(parsed.data)
          .where(eq(affiliateLinks.id, linkId))
          .returning();
        await audit(
          tx,
          session.user.id,
          "affiliate_link.update",
          "affiliate_link",
          linkId,
          before,
          after,
        );
        return { ok: true as const, id: linkId, message: "Affiliate link saved." };
      }
      const [created] = await tx
        .insert(affiliateLinks)
        .values({ ...parsed.data, providerId })
        .returning();
      await audit(
        tx,
        session.user.id,
        "affiliate_link.create",
        "affiliate_link",
        created.id,
        null,
        created,
      );
      return { ok: true as const, id: created.id, message: "Affiliate link added." };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done(path, result);
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------
/** Replaces secondary categories and explicit group memberships (one record, many places). */
async function saveMemberships(
  tx: AdminTx,
  opportunityId: string,
  primaryCategoryId: string,
  m: ReturnType<typeof membershipsFromForm>,
) {
  await tx
    .delete(opportunityCategories)
    .where(eq(opportunityCategories.opportunityId, opportunityId));
  await tx.delete(opportunityGroups).where(eq(opportunityGroups.opportunityId, opportunityId));
  // A whole-category entry for the primary category would be redundant.
  const secondary = m.secondary.filter(
    (s) => !(s.categoryId === primaryCategoryId && !s.subcategoryId),
  );
  if (secondary.length)
    await tx
      .insert(opportunityCategories)
      .values(secondary.map((s) => ({ ...s, opportunityId })))
      .onConflictDoNothing();
  if (m.groupIds.length)
    await tx
      .insert(opportunityGroups)
      .values(m.groupIds.map((groupId) => ({ opportunityId, groupId })))
      .onConflictDoNothing();
}
export async function saveOpportunity(opportunityId: string | null, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = opportunityId ? `/admin/opportunities/${opportunityId}` : "/admin/opportunities/new";
  const parsed = opportunitySchema.safeParse(
    formToObject(form, { arrays: ["countries"], booleans: ["isSponsored"] }),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const details = opportunityDetailsSchema.safeParse(
    formToObject(form, { booleans: ["commissionRecurring", "isFeatured"] }),
  );
  if (!details.success) return { error: firstError(details.error) };
  const data = {
    ...parsed.data,
    ...details.data,
    attributes: attributesFromForm(form, ATTRIBUTE_KEYS),
  };
  const memberships = membershipsFromForm(form);

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      // Cross-checks the form can't enforce on its own.
      if (data.subcategoryId) {
        const [sub] = await tx
          .select({ id: subcategories.id })
          .from(subcategories)
          .where(
            and(
              eq(subcategories.id, data.subcategoryId),
              eq(subcategories.categoryId, data.categoryId),
            ),
          );
        if (!sub)
          return {
            ok: false as const,
            message: "The subcategory doesn't belong to the chosen category.",
          };
      }
      if (data.affiliateLinkId) {
        const [link] = await tx
          .select({ id: affiliateLinks.id })
          .from(affiliateLinks)
          .where(
            and(
              eq(affiliateLinks.id, data.affiliateLinkId),
              eq(affiliateLinks.providerId, data.providerId),
            ),
          );
        if (!link)
          return {
            ok: false as const,
            message: "The affiliate link belongs to a different provider.",
          };
      }
      if (data.status === "published" && !data.affiliateLinkId) {
        return {
          ok: false as const,
          message: "Attach an approved affiliate link before publishing.",
        };
      }

      if (opportunityId) {
        const [before] = await tx
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, opportunityId));
        if (!before) return { ok: false as const, message: "Opportunity not found." };
        const [after] = await tx
          .update(opportunities)
          .set(data)
          .where(eq(opportunities.id, opportunityId))
          .returning();
        await saveMemberships(tx, opportunityId, after.categoryId, memberships);
        await audit(
          tx,
          session.user.id,
          "opportunity.update",
          "opportunity",
          opportunityId,
          before,
          { ...after, memberships },
        );
        return { ok: true as const, id: opportunityId, message: "Opportunity saved." };
      }
      const [created] = await tx.insert(opportunities).values(data).returning();
      await saveMemberships(tx, created.id, created.categoryId, memberships);
      await audit(tx, session.user.id, "opportunity.create", "opportunity", created.id, null, {
        ...created,
        memberships,
      });
      return { ok: true as const, id: created.id, message: "Opportunity created." };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done(path, result, result.ok ? `/admin/opportunities/${result.id}` : undefined);
}

// ---------------------------------------------------------------------------
// Categories (the 8 are fixed by slug; admins edit text, icon, order and visibility)
// ---------------------------------------------------------------------------
export async function saveCategory(categoryId: string, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = "/admin/categories";
  const parsed = categorySchema.safeParse(formToObject(form, { booleans: ["isActive"] }));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      const [before] = await tx.select().from(categories).where(eq(categories.id, categoryId));
      if (!before) return { ok: false as const, message: "Category not found." };
      const [after] = await tx
        .update(categories)
        .set(parsed.data)
        .where(eq(categories.id, categoryId))
        .returning();
      await audit(tx, session.user.id, "category.update", "category", categoryId, before, after);
      return { ok: true as const, id: categoryId, message: `${after.name} saved.` };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done(path, result);
}

export async function addSubcategory(form: FormData) {
  const { session, db } = await requireAdmin();
  const path = "/admin/categories";
  const parsed = subcategorySchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(subcategories).values(parsed.data).returning();
      await audit(
        tx,
        session.user.id,
        "subcategory.create",
        "subcategory",
        created.id,
        null,
        created,
      );
      return { ok: true as const, id: created.id, message: `Subcategory "${created.name}" added.` };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done(path, result);
}

export async function toggleSubcategory(subcategoryId: string) {
  const { session, db } = await requireAdmin();
  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(subcategories)
        .where(eq(subcategories.id, subcategoryId));
      if (!before) return { ok: false as const, message: "Subcategory not found." };
      const [after] = await tx
        .update(subcategories)
        .set({ isActive: !before.isActive })
        .where(eq(subcategories.id, subcategoryId))
        .returning();
      await audit(
        tx,
        session.user.id,
        "subcategory.toggle",
        "subcategory",
        subcategoryId,
        before,
        after,
      );
      return {
        ok: true as const,
        id: subcategoryId,
        message: `${after.name} ${after.isActive ? "shown" : "hidden"}.`,
      };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  return done("/admin/categories", result);
}
