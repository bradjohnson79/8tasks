import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Container } from "@/components/app/container";
import { buttonClass } from "@/components/app/public-form";
import { withPublicDb } from "@/db/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string; done?: string }> };

async function unsubscribe(form: FormData) {
  "use server";
  const token = z.string().uuid().safeParse(form.get("token"));
  if (token.success) {
    await withPublicDb((tx) => tx.execute(sql`select unsubscribe_alerts(${token.data}::uuid)`));
  }
  // Same response whether or not the token existed.
  redirect("/alerts/unsubscribe?done=1");
}

/** Confirmation step (a button, not a GET side effect) so link scanners can't unsubscribe people. */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { token, done } = await searchParams;
  return (
    <Container className="flex max-w-xl flex-col gap-4 pt-8">
      <h1 className="text-2xl font-bold">Unsubscribe from alerts</h1>
      {done ? (
        <p role="status" className="text-text-2">
          You won&apos;t receive any more 8Tasks alert emails.
        </p>
      ) : token ? (
        <form action={unsubscribe} className="flex flex-col gap-3">
          <input type="hidden" name="token" value={token} />
          <p className="text-text-2">Stop all 8Tasks opportunity alert emails to this address?</p>
          <button type="submit" className={buttonClass}>
            Unsubscribe
          </button>
        </form>
      ) : (
        <p className="text-text-2">Use the unsubscribe link from any alert email.</p>
      )}
    </Container>
  );
}
