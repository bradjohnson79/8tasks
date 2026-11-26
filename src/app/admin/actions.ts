"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { affiliateLinks, categories, opportunities, providers, subcategories } from "@/db/schema";
import { audit, requireAdmin } from "@/lib/admin";
import {
  affiliateLinkSchema,
  categorySchema,
  firstError,
  formToObject,
  opportunitySchema,
  providerSchema,
  subcategorySchema,
} from "@/lib/validation/admin";

/**
 * Admin mutations. Every action:
 *  1. calls requireAdmin() (server-side role + MFA check, CLAUDE.md rule 4),
 *  2. validates input with Zod,
 *  3. writes through the app_admin connection inside a transaction with an audit entry.
 * Records are archived/deactivated rather than deleted, to keep click history intact.
 */

type Result = { ok: true; id: string; message: string } | { ok: false; message: string };

export type ActionState = { error: string } | undefined;

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

function revalidatePublic() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
export async function saveProvider(providerId: string | null, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = providerId ? `/admin/providers/${providerId}` : "/admin/providers/new";
  const parsed = providerSchema.safeParse(formToObject(form, { arrays: ["countries"] }));
  if (!parsed.success) return { error: firstError(parsed.error) };

  let result: Result;
  try {
    result = await db.transaction(async (tx) => {
      if (providerId) {
        const [before] = await tx.select().from(providers).where(eq(providers.id, providerId));
        if (!before) return { ok: false as const, message: "Provider not found." };
        const [after] = await tx
          .update(providers)
          .set(parsed.data)
          .where(eq(providers.id, providerId))
          .returning();
        await audit(tx, session.user.id, "provider.update", "provider", providerId, before, after);
        return { ok: true as const, id: providerId, message: "Provider saved." };
      }
      const [created] = await tx.insert(providers).values(parsed.data).returning();
      await audit(tx, session.user.id, "provider.create", "provider", created.id, null, created);
      return {
        ok: true as const,
        id: created.id,
        message: "Provider created. Add its affiliate link below.",
      };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  revalidatePublic();
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
  revalidatePublic();
  return done(path, result);
}

// ---------------------------------------------------------------------------
// Opportunities
// ---------------------------------------------------------------------------
export async function saveOpportunity(opportunityId: string | null, form: FormData) {
  const { session, db } = await requireAdmin();
  const path = opportunityId ? `/admin/opportunities/${opportunityId}` : "/admin/opportunities/new";
  const parsed = opportunitySchema.safeParse(
    formToObject(form, { arrays: ["countries"], booleans: ["isSponsored"] }),
  );
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

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
        await audit(
          tx,
          session.user.id,
          "opportunity.update",
          "opportunity",
          opportunityId,
          before,
          after,
        );
        return { ok: true as const, id: opportunityId, message: "Opportunity saved." };
      }
      const [created] = await tx.insert(opportunities).values(data).returning();
      await audit(
        tx,
        session.user.id,
        "opportunity.create",
        "opportunity",
        created.id,
        null,
        created,
      );
      return { ok: true as const, id: created.id, message: "Opportunity created." };
    });
  } catch (err) {
    result = { ok: false, message: dbError(err) };
  }
  revalidatePublic();
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
  revalidatePublic();
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
  revalidatePublic();
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
  revalidatePublic();
  return done("/admin/categories", result);
}
