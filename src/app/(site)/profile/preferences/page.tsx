import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { PrefsFields } from "@/components/email/prefs-fields";
import { getActiveCategories } from "@/db/queries/public";
import { userProfiles } from "@/db/schema";
import { requireUser, withUserDb } from "@/lib/account";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { saveProfile, skipOnboarding } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Choose your adventure", robots: { index: false } };

export default async function PreferencesPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/profile/preferences");
  const { welcome } = await searchParams;
  const [[p], categories, config] = await Promise.all([
    withUserDb(user.id, (tx) => tx.select().from(userProfiles).where(eq(userProfiles.userId, user.id))),
    getActiveCategories(),
    getDiscoveryConfig(),
  ]);
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Choose your adventure</h1>
        <p className="mt-1 text-text-2">
          Tell us what you enjoy so My Daily 8 fits you. Everything is optional and you can change it
          any time.
        </p>
      </div>
      <PublicForm action={saveProfile} className="relative flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pr-name" className={labelClass}>
              Display name <span className="font-normal text-text-2">(optional)</span>
            </label>
            <input id="pr-name" name="displayName" maxLength={60} defaultValue={p?.displayName ?? ""} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pr-exp" className={labelClass}>
              Experience
            </label>
            <select id="pr-exp" name="experienceLevel" defaultValue={p?.experienceLevel ?? ""} className={inputClass}>
              <option value="">Prefer not to say</option>
              <option value="new">New to this</option>
              <option value="some">Some experience</option>
              <option value="experienced">Experienced</option>
            </select>
          </div>
        </div>
        <PrefsFields
          showFrequency={false}
          categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
          subsections={config.subsections.map((s) => ({ value: s.slug, label: s.title }))}
          defaults={
            p
              ? {
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
        <button type="submit" className={buttonClass}>
          Save preferences
        </button>
      </PublicForm>
      {welcome && (
        <form action={skipOnboarding}>
          <button type="submit" className="text-sm text-text-2 underline-offset-4 hover:underline">
            Skip for now
          </button>
        </form>
      )}
    </Container>
  );
}
