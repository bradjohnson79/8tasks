"use server";

import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  categories,
  discoveryGroups,
  listingReports,
  providerSubmissions,
  subcategories,
} from "@/db/schema";
import { audit, requireAdmin } from "@/lib/admin";
import { DISCOVERY_ICONS } from "@/lib/discovery/icons";
import { firstError, formToObject, slugSchema } from "@/lib/validation/admin";

/** Admin-only: discovery groups (pathways, category tabs, /earn subsections) and the inbox. */
type State = { error: string } | undefined;

const slugList = z
  .string()
  .max(5000)
  .optional()
  .transform((v) => [
    ...new Set(
      (v ?? "")
        .split(/[\s,]+/)
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ])
  .pipe(z.array(slugSchema).max(100));

const groupSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z
    .string()
    .trim()
    .max(280)
    .optional()
    .transform((v) => v || null),
  icon: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || v in DISCOVERY_ICONS, "Unknown icon"),
  accent: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^#[0-9a-fA-F]{6}$/.test(v), "Accent must be like #53E6A0"),
  includes: z
    .string()
    .max(3000)
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  subcategorySlugs: slugList,
  categorySlugs: slugList,
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

const newGroupSchema = z.object({
  kind: z.enum(["pathway", "category_tab", "subsection"]),
  slug: slugSchema,
  categoryId: z
    .string()
    .optional()
    .transform((v) => v || null),
});

export async function saveGroup(groupId: string | null, form: FormData): Promise<State> {
  const { session, db } = await requireAdmin();
  const parsed = groupSchema.safeParse(formToObject(form, { booleans: ["isActive"] }));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  // Unknown slugs would silently match nothing; reject them.
  const [subs, cats] = await Promise.all([
    data.subcategorySlugs.length
      ? db
          .select({ slug: subcategories.slug })
          .from(subcategories)
          .where(inArray(subcategories.slug, data.subcategorySlugs))
      : [],
    data.categorySlugs.length
      ? db
          .select({ slug: categories.slug })
          .from(categories)
          .where(inArray(categories.slug, data.categorySlugs))
      : [],
  ]);
  const unknownSubs = data.subcategorySlugs.filter((s) => !subs.some((x) => x.slug === s));
  const unknownCats = data.categorySlugs.filter((s) => !cats.some((x) => x.slug === s));
  if (unknownSubs.length || unknownCats.length)
    return {
      error: `Unknown slugs: ${[...unknownSubs, ...unknownCats].join(", ")}. Check /admin/categories.`,
    };

  let id = groupId;
  try {
    await db.transaction(async (tx) => {
      if (groupId) {
        const [before] = await tx
          .select()
          .from(discoveryGroups)
          .where(eq(discoveryGroups.id, groupId));
        if (!before) throw new Error("not found");
        const [after] = await tx
          .update(discoveryGroups)
          .set(data)
          .where(eq(discoveryGroups.id, groupId))
          .returning();
        await audit(
          tx,
          session.user.id,
          "discovery_group.update",
          "discovery_group",
          groupId,
          before,
          after,
        );
      } else {
        const head = newGroupSchema.safeParse(formToObject(form));
        if (!head.success) throw new Error(firstError(head.error));
        if ((head.data.kind === "category_tab") !== !!head.data.categoryId)
          throw new Error("Category tabs need a category; other groups must not have one.");
        const [created] = await tx
          .insert(discoveryGroups)
          .values({ ...data, ...head.data })
          .returning();
        id = created.id;
        await audit(
          tx,
          session.user.id,
          "discovery_group.create",
          "discovery_group",
          created.id,
          null,
          created,
        );
      }
    });
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string }; message?: string };
    const code = e.code ?? e.cause?.code;
    if (code === "23505") return { error: "That slug is already used for this kind of group." };
    if (e.message && !code) return { error: e.message };
    console.error(err);
    return { error: "Couldn't save. Nothing was changed." };
  }
  redirect(`/admin/discovery?saved=${encodeURIComponent("Saved.")}#g-${id}`);
}

// ---------------------------------------------------------------------------
// Inbox: listing reports and provider submissions (never auto-published)
// ---------------------------------------------------------------------------
const reviewSchema = z.object({
  status: z.enum(["new", "reviewed", "dismissed"]),
  adminNote: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => v || null),
});

export async function reviewIntake(
  kind: "report" | "submission",
  id: number,
  form: FormData,
): Promise<State> {
  const { session, db } = await requireAdmin();
  const parsed = reviewSchema.safeParse(formToObject(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const table = kind === "report" ? listingReports : providerSubmissions;
  try {
    await db.transaction(async (tx) => {
      const [before] = await tx.select().from(table).where(eq(table.id, id));
      if (!before) throw new Error("not found");
      await tx.update(table).set(parsed.data).where(eq(table.id, id));
      await audit(
        tx,
        session.user.id,
        `${kind}.review`,
        kind,
        String(id),
        { status: before.status },
        parsed.data,
      );
    });
  } catch (err) {
    console.error(err);
    return { error: "Couldn't update. Nothing was changed." };
  }
  redirect(`/admin/inbox?saved=${encodeURIComponent("Updated.")}`);
}
