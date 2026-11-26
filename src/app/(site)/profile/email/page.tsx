import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { Container } from "@/components/app/container";
import { buttonClass, PublicForm } from "@/components/app/public-form";
import { FormMessage } from "@/components/admin/form-message";
import { PrefsFields } from "@/components/email/prefs-fields";
import { getActiveCategories } from "@/db/queries/public";
import { userProfiles } from "@/db/schema";
import { requireUser, withUserDb } from "@/lib/account";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { CONSENT_TEXT } from "@/lib/email/config";
import { accountSubscribe, accountUnsubscribe } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email & Alerts", robots: { index: false } };

type Sub = { status: string; frequency: string; consentedAt: string; consentSource: string } | null;

export default async function AccountEmailPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser("/profile/email");
  const sp = await searchParams;
  const [sub, [p], categories, config] = await Promise.all([
    withUserDb(user.id, async (tx) => (await tx.execute<{ s: Sub }>(sql`select email_account_get() as s`)).rows[0]?.s ?? null),
    withUserDb(user.id, (tx) => tx.select().from(userProfiles).where(eq(userProfiles.userId, user.id))),
    getActiveCategories(),
    getDiscoveryConfig(),
  ]);
  const active = sub?.status === "active";
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Email & Alerts</h1>
        <p className="text-sm text-text-2">
          Free, optional, and separate from your account. Creating an account never subscribes you.
          Account emails (sign-in links) are sent only when you ask for them.
        </p>
      </div>
      <FormMessage saved={sp.saved} />
      <p className="rounded-xl border bg-surface p-4 text-sm">
        {active
          ? `Subscribed to My Daily 8 (${sub!.frequency.replace("_", " ")}) at ${user.email}.`
          : sub?.status === "bounced" || sub?.status === "complained"
            ? "We can't email this address because it bounced or reported spam."
            : `Not subscribed. ${user.email} won't receive promotional emails.`}
      </p>
      <PublicForm action={accountSubscribe} className="relative flex flex-col gap-4">
        <PrefsFields
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
          subsections={config.subsections.map((s) => ({ value: s.slug, label: s.title }))}
          defaults={
            p
              ? {
                  frequency: (active ? sub!.frequency : "daily") as never,
                  country: (p.country as "CA" | "US" | null) ?? "",
                  region: p.region ?? "",
                  city: p.city ?? "",
                  categories: p.categories,
                  creativeInterests: p.creativeInterests,
                  workMode: p.workMode,
                  beginnerOnly: p.beginnerOnly,
                  equipment: p.equipment as never,
                  compensationTypes: p.compensationTypes as never,
                  timeZone: p.timeZone,
                }
              : undefined
          }
        />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" value="yes" required className="mt-0.5 size-4" />
          {CONSENT_TEXT}
        </label>
        <button type="submit" className={buttonClass}>
          {active ? "Update email preferences" : "Get My Daily 8 by email"}
        </button>
      </PublicForm>
      {active && (
        <form action={accountUnsubscribe as never}>
          <button type="submit" className="text-sm text-text-2 underline-offset-4 hover:underline">
            Unsubscribe from all promotional emails
          </button>
        </form>
      )}
    </Container>
  );
}
