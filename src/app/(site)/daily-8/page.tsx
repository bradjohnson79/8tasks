import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { PrefsFields } from "@/components/email/prefs-fields";
import { getActiveCategories } from "@/db/queries/public";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { CONSENT_TEXT } from "@/lib/email/config";
import { subscribeDaily8 } from "../email-actions";
import { MissionGrid } from "@/components/app/mission-card";
import { ListingDisclosure } from "@/components/app/listing-disclosure";
import { userProfiles } from "@/db/schema";
import { getUser, withUserDb } from "@/lib/account";
import { recommendDaily8 } from "@/lib/email/daily8";
import { loadOpportunities } from "@/lib/missions/source";

/** On-site Daily 8 for signed-in users, from their saved preferences. */
async function personalDaily8(
  userId: string,
  subsections: Parameters<typeof recommendDaily8>[2]["subsections"],
) {
  const [p] = await withUserDb(userId, (tx) =>
    tx.select().from(userProfiles).where(eq(userProfiles.userId, userId)),
  );
  if (!p) return null;
  const r = recommendDaily8(
    {
      country: p.country,
      region: p.region,
      city: p.city,
      categories: p.categories,
      creativeInterests: p.creativeInterests,
      workMode: p.workMode as "any" | "remote" | "local",
      beginnerOnly: p.beginnerOnly,
      equipment: p.equipment,
      compensationTypes: p.compensationTypes,
    },
    await loadOpportunities(),
    { subsections, recentlySent: [], lastSent: [], requireEmailPermission: false },
  );
  return r.send ? r.items : [];
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Daily 8",
  description:
    "Up to eight verified earning opportunities picked for you, by free email. Always free.",
  alternates: { canonical: "/daily-8" },
};

export default async function Daily8Page() {
  const [categories, config, user] = await Promise.all([
    getActiveCategories(),
    getDiscoveryConfig(),
    getUser().catch(() => null),
  ]);
  const picks = user ? await personalDaily8(user.id, config.subsections) : null;
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">My Daily 8</h1>
      <div className="rounded-2xl border border-emerald/15 bg-daily8 p-5">
        <p className="font-semibold">A new day. New possibilities.</p>
        <p className="mt-1 text-sm text-text-2">
          Get up to eight verified earning opportunities that fit you, by email, around 8 AM your
          time. Free, now and always. No account needed. We only send what we&apos;ve checked, so
          some days there are fewer than eight, and if nothing fits we don&apos;t send anything.
        </p>
      </div>

      {user && picks && (
        <section aria-labelledby="today-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="today-title" className="text-lg font-semibold">
              Picked for you today
            </h2>
            <Link
              href="/profile/preferences"
              className="text-sm font-medium text-emerald hover:underline"
            >
              Edit preferences
            </Link>
          </div>
          {picks.length ? (
            <>
              <MissionGrid items={picks} />
              <ListingDisclosure items={picks} />
            </>
          ) : (
            <p className="rounded-xl border bg-surface p-4 text-sm text-text-2">
              Nothing matches your preferences yet. We only list opportunities we&apos;ve checked,
              so try widening your categories or check back soon.
            </p>
          )}
        </section>
      )}
      {user && !picks && (
        <p className="rounded-xl border bg-surface p-4 text-sm text-text-2">
          <Link href="/profile/preferences" className="font-medium text-emerald hover:underline">
            Choose your adventure
          </Link>{" "}
          to see a Daily 8 picked for you here.
        </p>
      )}
      {!user && (
        <p className="rounded-xl border bg-surface p-4 text-sm text-text-2">
          Want your Daily 8 on the site too?{" "}
          <Link
            href="/profile/sign-in?next=/daily-8"
            className="font-medium text-emerald hover:underline"
          >
            Create a free account
          </Link>{" "}
          to personalize it. Optional: email works without one.
        </p>
      )}

      {user ? (
        <p className="text-sm text-text-2">
          Manage your Daily 8 emails in{" "}
          <Link href="/profile/email" className="font-medium text-emerald hover:underline">
            Email &amp; Alerts
          </Link>
          .
        </p>
      ) : (
        <section id="signup" aria-labelledby="signup-title" className="scroll-mt-20">
          <h2 id="signup-title" className="mb-3 text-lg font-semibold">
            Get My Daily 8 by email
          </h2>
          <PublicForm action={subscribeDaily8} className="relative flex flex-col gap-4">
            <input type="hidden" name="source" value="daily-8-page" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="d8-email" className={labelClass}>
                Email
              </label>
              <input
                id="d8-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className={inputClass}
              />
            </div>
            <PrefsFields
              categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
              subsections={config.subsections.map((s) => ({ value: s.slug, label: s.title }))}
            />
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="consent"
                value="yes"
                required
                className="mt-0.5 size-4"
              />
              {CONSENT_TEXT}
            </label>
            <p className="text-xs text-text-2">
              We&apos;ll email you a confirmation link first. We never sell your address. Every
              email includes our contact details and a one-click unsubscribe.
            </p>
            <button type="submit" className={buttonClass}>
              Get My Daily 8 free
            </button>
          </PublicForm>
        </section>
      )}
    </Container>
  );
}
