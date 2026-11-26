import type { Metadata } from "next";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { Container } from "@/components/app/container";
import { buttonClass, PublicForm } from "@/components/app/public-form";
import { PrefsFields } from "@/components/email/prefs-fields";
import { withPublicDb } from "@/db/client";
import { getActiveCategories } from "@/db/queries/public";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import type { EmailPrefs } from "@/lib/email/prefs";
import { updateDaily8Prefs } from "../../email-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Email preferences", robots: { index: false } };

type Prefs = EmailPrefs & { email: string; status: string };

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const t = z.string().uuid().safeParse(token);
  const prefs = t.success
    ? ((
        await withPublicDb((tx) =>
          tx.execute<{ p: Prefs | null }>(sql`select email_get_prefs(${t.data}::uuid) as p`),
        )
      ).rows[0]?.p ?? null)
    : null;
  const [categories, config] = await Promise.all([getActiveCategories(), getDiscoveryConfig()]);

  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Email preferences</h1>
      {!prefs ? (
        <p className="text-text-2">Use the “Manage preferences” link from any 8Tasks email.</p>
      ) : prefs.status === "active" || prefs.status === "pending" ? (
        <>
          <p className="text-sm text-text-2">
            Settings for {prefs.email}. Free, always.{" "}
            {prefs.status === "pending" && "Please confirm your email using the link we sent."}
          </p>
          <PublicForm
            action={updateDaily8Prefs.bind(null, t.data!)}
            className="relative flex flex-col gap-4"
            keepForm
          >
            <PrefsFields
              categories={categories.map((c) => ({ value: c.slug, label: c.name }))}
              subsections={config.subsections.map((s) => ({ value: s.slug, label: s.title }))}
              defaults={prefs}
            />
            <button type="submit" className={buttonClass}>
              Save preferences
            </button>
          </PublicForm>
          <Link
            href={`/email/unsubscribe?token=${t.data}`}
            className="text-sm text-text-2 hover:underline"
          >
            Unsubscribe from all promotional emails
          </Link>
        </>
      ) : (
        <p className="text-text-2">
          This address is unsubscribed. To receive My Daily 8 again,{" "}
          <Link href="/daily-8#signup" className="text-emerald hover:underline">
            sign up again
          </Link>
          .
        </p>
      )}
    </Container>
  );
}
