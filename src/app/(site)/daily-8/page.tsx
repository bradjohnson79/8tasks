import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { PrefsFields } from "@/components/email/prefs-fields";
import { getActiveCategories } from "@/db/queries/public";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { CONSENT_TEXT } from "@/lib/email/config";
import { subscribeDaily8 } from "../email-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "My Daily 8",
  description:
    "Up to eight verified earning opportunities picked for you, by free email. Always free.",
  alternates: { canonical: "/daily-8" },
};

export default async function Daily8Page() {
  const [categories, config] = await Promise.all([getActiveCategories(), getDiscoveryConfig()]);
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
            <input type="checkbox" name="consent" value="yes" required className="mt-0.5 size-4" />
            {CONSENT_TEXT}
          </label>
          <p className="text-xs text-text-2">
            We&apos;ll email you a confirmation link first. We never sell your address. Every email
            includes our contact details and a one-click unsubscribe.
          </p>
          <button type="submit" className={buttonClass}>
            Get My Daily 8 free
          </button>
        </PublicForm>
      </section>
    </Container>
  );
}
