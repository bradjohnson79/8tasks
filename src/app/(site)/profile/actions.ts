"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  userEarnings,
  userMissions,
  userProfiles,
  userSavedItems,
  userSavedSearches,
} from "@/db/schema";
import { earningSchema, missionSchema, profileSchema } from "@/lib/account-schemas";
import { requireUser, withUserDb } from "@/lib/account";
import { CONSENT_TEXT, CONSENT_VERSION } from "@/lib/email/config";
import { prefsFromForm, prefsSchema } from "@/lib/email/prefs";
import { firstError } from "@/lib/validation/admin";

/**
 * Account actions. Every action re-checks the session (requireUser) and runs with app.user_id
 * set, so RLS limits it to the signed-in user's own rows. All features are free.
 */
type State = { ok: string } | { error: string } | undefined;
function back(path: string, msg: string): never {
  redirect(`${path}?saved=${encodeURIComponent(msg)}`);
}

// ---------------------------------------------------------------------------
// Preferences ("Choose your adventure")
// ---------------------------------------------------------------------------
export async function saveProfile(form: FormData): Promise<State> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    ...prefsFromForm(form),
    displayName: form.get("displayName") ?? "",
    experienceLevel: form.get("experienceLevel") ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const p = parsed.data;
  const values = {
    displayName: p.displayName,
    country: p.country || null,
    region: p.region || null,
    city: p.city || null,
    categories: p.categories,
    creativeInterests: p.creativeInterests,
    workMode: p.workMode,
    beginnerOnly: p.beginnerOnly,
    experienceLevel: p.experienceLevel,
    equipment: p.equipment,
    compensationTypes: p.compensationTypes,
    timeZone: p.timeZone,
    onboardedAt: new Date(),
  };
  await withUserDb(user.id, (tx) =>
    tx
      .insert(userProfiles)
      .values({ userId: user.id, ...values })
      .onConflictDoUpdate({ target: userProfiles.userId, set: values }),
  );
  back("/profile", "Preferences saved.");
}

export async function skipOnboarding(): Promise<void> {
  const user = await requireUser();
  await withUserDb(user.id, (tx) =>
    tx
      .insert(userProfiles)
      .values({ userId: user.id, onboardedAt: new Date() })
      .onConflictDoUpdate({ target: userProfiles.userId, set: { onboardedAt: new Date() } }),
  );
  redirect("/profile");
}

// ---------------------------------------------------------------------------
// Saved opportunities and searches (merged with what was saved on the device)
// ---------------------------------------------------------------------------
const itemId = z.string().regex(/^(demo-[a-z0-9-]{1,60}|[0-9a-f-]{36})$/);
const searchShape = z.object({
  q: z.string().max(200).optional(),
  f: z.array(z.string().max(40)).max(20),
  path: z.string().max(60).optional(),
  label: z.string().max(200),
});

export async function syncSaved(local: { items: string[]; searches: unknown[] }) {
  const user = await requireUser();
  const items = z.array(itemId).max(500).catch([]).parse(local.items);
  const searches = z.array(searchShape).max(50).catch([]).parse(local.searches);
  return withUserDb(user.id, async (tx) => {
    if (items.length)
      await tx
        .insert(userSavedItems)
        .values(items.map((i) => ({ userId: user.id, itemId: i })))
        .onConflictDoNothing();
    const existing = await tx.select().from(userSavedSearches);
    const key = (s: { q?: string | null; f: string[]; path?: string | null }) =>
      JSON.stringify([s.q ?? "", [...s.f].sort(), s.path ?? ""]);
    const have = new Set(existing.map((s) => key({ q: s.q, f: s.filters, path: s.path })));
    const add = searches.filter((s) => !have.has(key(s)));
    if (add.length)
      await tx.insert(userSavedSearches).values(
        add.map((s) => ({ userId: user.id, q: s.q ?? null, filters: s.f, path: s.path ?? null, label: s.label })),
      );
    const allItems = await tx
      .select({ itemId: userSavedItems.itemId })
      .from(userSavedItems)
      .orderBy(sql`${userSavedItems.createdAt} desc`);
    const allSearches = await tx.select().from(userSavedSearches).orderBy(sql`${userSavedSearches.createdAt} desc`);
    return {
      items: allItems.map((r) => r.itemId),
      searches: allSearches.map((s) => ({
        q: s.q ?? undefined,
        f: s.filters,
        path: s.path ?? undefined,
        label: s.label,
        savedAt: s.createdAt.toISOString(),
      })),
    };
  });
}

export async function setSaved(id: string, saved: boolean) {
  const user = await requireUser();
  if (!itemId.safeParse(id).success) return;
  await withUserDb(user.id, (tx) =>
    saved
      ? tx.insert(userSavedItems).values({ userId: user.id, itemId: id }).onConflictDoNothing()
      : tx.delete(userSavedItems).where(eq(userSavedItems.itemId, id)),
  );
}

export async function setSavedSearch(search: unknown, saved: boolean) {
  const user = await requireUser();
  const s = searchShape.safeParse(search);
  if (!s.success) return;
  await withUserDb(user.id, async (tx) => {
    const rows = await tx.select().from(userSavedSearches);
    const same = rows.filter(
      (r) =>
        (r.q ?? "") === (s.data.q ?? "") &&
        (r.path ?? "") === (s.data.path ?? "") &&
        [...r.filters].sort().join() === [...s.data.f].sort().join(),
    );
    if (saved && !same.length)
      await tx.insert(userSavedSearches).values({
        userId: user.id,
        q: s.data.q ?? null,
        filters: s.data.f,
        path: s.data.path ?? null,
        label: s.data.label,
      });
    if (!saved && same.length)
      await tx.delete(userSavedSearches).where(inArray(userSavedSearches.id, same.map((r) => r.id)));
  });
}

// ---------------------------------------------------------------------------
// My Missions (personal tracker; 8Tasks never verifies third-party work)
// ---------------------------------------------------------------------------
export async function addMission(form: FormData): Promise<State> {
  const user = await requireUser();
  const p = missionSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: firstError(p.error) };
  await withUserDb(user.id, (tx) =>
    tx.insert(userMissions).values({
      userId: user.id,
      providerName: p.data.providerName,
      title: p.data.title,
      status: p.data.status,
      notes: p.data.notes || null,
      opportunityId: p.data.opportunityId || null,
    }),
  );
  back("/profile/missions", "Added.");
}

export async function updateMission(id: string, form: FormData): Promise<State> {
  const user = await requireUser();
  const status = missionSchema.shape.status.safeParse(form.get("status"));
  if (!z.string().uuid().safeParse(id).success || !status.success) return { error: "Invalid" };
  await withUserDb(user.id, (tx) =>
    form.get("delete") === "1"
      ? tx.delete(userMissions).where(eq(userMissions.id, id))
      : tx.update(userMissions).set({ status: status.data }).where(eq(userMissions.id, id)),
  );
  back("/profile/missions", "Updated.");
}

// ---------------------------------------------------------------------------
// My Earnings (self-reported log, not a wallet)
// ---------------------------------------------------------------------------
export async function addEarning(form: FormData): Promise<State> {
  const user = await requireUser();
  const p = earningSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { error: firstError(p.error) };
  const e = p.data;
  await withUserDb(user.id, (tx) =>
    tx.insert(userEarnings).values({
      userId: user.id,
      providerName: e.providerName,
      activity: e.activity || null,
      earnedOn: e.earnedOn,
      amountCents: e.amount,
      expensesCents: e.expenses,
      reimbursementCents: e.reimbursement,
      currency: e.currency,
      status: e.status,
      notes: e.notes || null,
    }),
  );
  back("/profile/earnings", "Added.");
}

export async function updateEarning(id: string, form: FormData): Promise<State> {
  const user = await requireUser();
  if (!z.string().uuid().safeParse(id).success) return { error: "Invalid" };
  await withUserDb(user.id, (tx) =>
    form.get("delete") === "1"
      ? tx.delete(userEarnings).where(eq(userEarnings.id, id))
      : tx
          .update(userEarnings)
          .set({ status: form.get("status") === "received" ? "received" : "expected" })
          .where(and(eq(userEarnings.id, id))),
  );
  back("/profile/earnings", "Updated.");
}

// ---------------------------------------------------------------------------
// Email & alerts (never enrolled automatically; consent recorded)
// ---------------------------------------------------------------------------
export async function accountSubscribe(form: FormData): Promise<State> {
  const user = await requireUser();
  if (form.get("consent") !== "yes") return { error: "Tick the box to agree to receive emails" };
  const prefs = prefsSchema.safeParse(prefsFromForm(form));
  if (!prefs.success) return { error: firstError(prefs.error) };
  const r = await withUserDb(user.id, (tx) =>
    tx.execute<{ ok: boolean }>(
      sql`select email_account_subscribe(${JSON.stringify(prefs.data)}::jsonb, ${CONSENT_TEXT}, ${CONSENT_VERSION}) as ok`,
    ),
  );
  if (!r.rows[0]?.ok)
    return { error: "We can't email this address (it previously bounced or reported spam)." };
  back("/profile/email", "Email preferences saved.");
}

export async function accountUnsubscribe(): Promise<State> {
  const user = await requireUser();
  await withUserDb(user.id, (tx) => tx.execute(sql`select email_account_unsubscribe()`));
  back("/profile/email", "Unsubscribed from all promotional emails.");
}

// ---------------------------------------------------------------------------
// Privacy & account
// ---------------------------------------------------------------------------
export async function deleteAccount(form: FormData): Promise<State> {
  const user = await requireUser();
  if (String(form.get("confirm") ?? "").trim().toUpperCase() !== "DELETE")
    return { error: 'Type DELETE to confirm.' };
  const r = await withUserDb(user.id, (tx) =>
    tx.execute<{ ok: boolean }>(sql`select delete_my_account() as ok`),
  );
  if (!r.rows[0]?.ok) return { error: "This account can't be deleted here." };
  redirect("/?account=deleted");
}
