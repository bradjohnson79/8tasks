"use server";

import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { withPublicDb } from "@/db/client";
import { allow } from "@/lib/affiliates/rate-limit";
import { CONSENT_TEXT, CONSENT_VERSION, emailConfig, siteOrigin } from "@/lib/email/config";
import { deliver } from "@/lib/email/deliver";
import { prefsFromForm, prefsSchema } from "@/lib/email/prefs";
import { confirmSubscriptionEmail, welcomeEmail } from "@/lib/email/templates/catalog";
import type { FooterProps } from "@/lib/email/templates/layout";
import { firstError } from "@/lib/validation/admin";
import type { IntakeState } from "./intake-actions";

/**
 * Free My Daily 8 email (no account, no payment). Double opt-in: nothing promotional is sent
 * until the address owner clicks the confirmation link. Consent wording, version, source and
 * time are stored. Existing confirmed addresses can't be changed by anyone without the token.
 */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address");
const token = z.string().uuid();

async function publicSettings(): Promise<{
  senderName: string;
  postalAddress: string | null;
  confirmEnabled: boolean;
}> {
  const r = await withPublicDb((tx) =>
    tx.execute<{ s: never }>(sql`select email_public_settings() as s`),
  );
  return (
    (r.rows[0]?.s as never) ?? {
      senderName: "8Tasks.com",
      postalAddress: null,
      confirmEnabled: true,
    }
  );
}

function transactionalFooter(s: { senderName: string; postalAddress: string | null }): FooterProps {
  return {
    kind: "transactional",
    senderName: s.senderName,
    postalAddress: s.postalAddress,
    siteUrl: siteOrigin(),
  };
}

/** Confirmation/welcome mail is live only with the env master switch and an API key. */
const transactionalLive = () => {
  const cfg = emailConfig();
  return cfg.automatedEnabled && !!cfg.apiKey;
};

export async function subscribeDaily8(form: FormData): Promise<IntakeState> {
  if (String(form.get("company_website") ?? "") !== "") return { ok: "Thanks!" };
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allow(`daily8:${ip}`, 5, 10 * 60_000))
    return { error: "Too many sign-ups from your connection. Please try again later." };
  const addr = email.safeParse(form.get("email"));
  if (!addr.success) return { error: firstError(addr.error) };
  if (form.get("consent") !== "yes") return { error: "Tick the box to agree to receive emails" };
  const prefs = prefsSchema.safeParse(prefsFromForm(form));
  if (!prefs.success) return { error: firstError(prefs.error) };
  const source = String(form.get("source") ?? "daily-8").slice(0, 40);

  let confirmToken: string | null = null;
  try {
    const r = await withPublicDb((tx) =>
      tx.execute<{ t: string | null }>(
        sql`select email_subscribe(${addr.data}, ${JSON.stringify(prefs.data)}::jsonb, ${CONSENT_TEXT}, ${CONSENT_VERSION}, ${source}) as t`,
      ),
    );
    confirmToken = r.rows[0]?.t ?? null;
  } catch (err) {
    console.error("subscribe failed", (err as Error).message);
    return { error: "Something went wrong. Please try again." };
  }
  if (confirmToken) {
    const s = await publicSettings();
    if (s.confirmEnabled) {
      const built = confirmSubscriptionEmail({
        confirmUrl: `${siteOrigin()}/email/confirm?token=${confirmToken}`,
        footer: transactionalFooter(s),
      });
      const res = await deliver(
        {
          from: emailConfig().from.welcome,
          to: addr.data,
          subject: built.subject,
          react: built.react,
        },
        transactionalLive(),
      );
      if (res.mode === "failed") console.error("confirmation email failed", res.error);
    }
  }
  // Same answer whether or not the address already existed (no account enumeration).
  return {
    ok: "Check your inbox: we sent a link to confirm your free email. Nothing is sent until you confirm.",
  };
}

export type ConfirmState = { ok: true; token: string } | { error: string } | undefined;

export async function confirmDaily8(_prev: ConfirmState, form: FormData): Promise<ConfirmState> {
  const t = token.safeParse(form.get("token"));
  if (!t.success) return { error: "This confirmation link isn't valid." };
  const r = await withPublicDb((tx) =>
    tx.execute<{ token: string | null }>(sql`select email_confirm(${t.data}::uuid) as token`),
  );
  const manageToken = r.rows[0]?.token;
  if (!manageToken) return { error: "This link has already been used or has expired." };
  const s = await publicSettings();
  const r2 = await withPublicDb((tx) =>
    tx.execute<{ p: { email: string } | null }>(
      sql`select email_get_prefs(${manageToken}::uuid) as p`,
    ),
  );
  const to = r2.rows[0]?.p?.email;
  if (to) {
    const built = welcomeEmail({
      discoverUrl: `${siteOrigin()}/missions`,
      footer: transactionalFooter(s),
    });
    const res = await deliver(
      { from: emailConfig().from.welcome, to, subject: built.subject, react: built.react },
      transactionalLive(),
    );
    if (res.mode === "failed") console.error("welcome email failed", res.error);
  }
  return { ok: true, token: manageToken };
}

export async function updateDaily8Prefs(tokenValue: string, form: FormData): Promise<IntakeState> {
  const t = token.safeParse(tokenValue);
  if (!t.success) return { error: "This link isn't valid." };
  const prefs = prefsSchema.safeParse(prefsFromForm(form));
  if (!prefs.success) return { error: firstError(prefs.error) };
  const r = await withPublicDb((tx) =>
    tx.execute<{ ok: boolean }>(
      sql`select email_update_prefs(${t.data}::uuid, ${JSON.stringify(prefs.data)}::jsonb) as ok`,
    ),
  );
  return r.rows[0]?.ok
    ? { ok: "Preferences saved." }
    : { error: "This link isn't valid any more." };
}

export async function unsubscribeDaily8(_prev: IntakeState, form: FormData): Promise<IntakeState> {
  const t = token.safeParse(form.get("token"));
  if (t.success)
    await withPublicDb((tx) => tx.execute(sql`select email_unsubscribe(${t.data}::uuid)`));
  // Same message either way.
  return { ok: "You're unsubscribed. You won't receive any more 8Tasks promotional emails." };
}
