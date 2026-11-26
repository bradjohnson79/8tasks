import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { getActiveCategories } from "@/db/queries/public";
import { ALERT_CONSENT } from "@/lib/intake/schemas";
import { subscribeToAlerts } from "../intake-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Free opportunity alerts",
  description: "Free email alerts for new verified earning opportunities. Always free.",
  alternates: { canonical: "/alerts" },
};

export default async function AlertsPage() {
  const categories = await getActiveCategories();
  return (
    <Container className="flex max-w-2xl flex-col gap-5 pt-5 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
          Free opportunity alerts
        </h1>
        <p className="mt-1 text-text-2">
          Get an email when new verified opportunities match what you like. Alerts are free, now and
          always. No account needed.
        </p>
      </div>
      <p className="rounded-xl border bg-surface p-4 text-sm text-text-2">
        Alert emails start once we have new verified listings to send. We&apos;ll never sell your
        address, and every email has a one-click unsubscribe link.
      </p>
      <PublicForm action={subscribeToAlerts} className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-email" className={labelClass}>
            Email
          </label>
          <input
            id="alert-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className={`${labelClass} mb-1`}>
            Categories <span className="font-normal text-text-2">(leave empty for all)</span>
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label
                key={c.slug}
                className="flex min-h-11 items-center gap-3 rounded-xl border bg-surface px-3 text-sm"
              >
                <input type="checkbox" name="categories" value={c.slug} className="size-4" />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-q" className={labelClass}>
            Keywords <span className="font-normal text-text-2">(optional)</span>
          </label>
          <input id="alert-q" name="q" maxLength={200} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="alert-frequency" className={labelClass}>
            How often
          </label>
          <select
            id="alert-frequency"
            name="frequency"
            defaultValue="weekly"
            className={inputClass}
          >
            <option value="weekly">Weekly digest</option>
            <option value="daily">Daily digest</option>
          </select>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" value="yes" required className="mt-0.5 size-4" />
          {ALERT_CONSENT}
        </label>
        <button type="submit" className={buttonClass}>
          Get free alerts
        </button>
      </PublicForm>
    </Container>
  );
}
