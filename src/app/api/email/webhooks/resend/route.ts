import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { adminDbUnsafe } from "@/db/client";
import { emailEvents, emailSends, emailSubscribers, emailSuppressions } from "@/db/schema";
import { emailConfig } from "@/lib/email/config";
import { isPermanentBounce, verifyResendWebhook } from "@/lib/email/webhook";

export const dynamic = "force-dynamic";

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: { email_id?: string; to?: string[]; bounce?: { type?: string } };
};

/**
 * Resend delivery webhooks: delivered / bounced / complained / opened / clicked / delayed.
 * Signature-verified (RESEND_WEBHOOK_SECRET). Permanent bounces and complaints add the address
 * to our suppression list and stop all mail to it. Idempotent on svix-id.
 */
export async function POST(req: NextRequest) {
  const secret = emailConfig().webhookSecret;
  const body = await req.text();
  const ok =
    !!secret &&
    verifyResendWebhook(
      secret,
      {
        id: req.headers.get("svix-id"),
        timestamp: req.headers.get("svix-timestamp"),
        signature: req.headers.get("svix-signature"),
      },
      body,
    );
  if (!ok) return new NextResponse(null, { status: 401 });

  let evt: ResendEvent;
  try {
    evt = JSON.parse(body);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const type = String(evt.type ?? "unknown").slice(0, 60);
  const resendId = evt.data?.email_id ?? null;
  const email = evt.data?.to?.[0]?.toLowerCase() ?? null;
  const db = adminDbUnsafe();

  await db.transaction(async (tx) => {
    const [send] = resendId
      ? await tx
          .select({ id: emailSends.id })
          .from(emailSends)
          .where(eq(emailSends.resendId, resendId))
      : [];
    const inserted = await tx
      .insert(emailEvents)
      .values({
        externalId: req.headers.get("svix-id"),
        type,
        resendId,
        sendId: send?.id ?? null,
        email,
        // Only non-sensitive fields; never headers or tokens.
        payload: { type, created_at: evt.created_at ?? null, bounce: evt.data?.bounce ?? null },
      })
      .onConflictDoNothing({ target: emailEvents.externalId })
      .returning({ id: emailEvents.id });
    if (!inserted.length || !email) return; // duplicate delivery

    const suppress = async (reason: string, status: "bounced" | "complained") => {
      await tx.insert(emailSuppressions).values({ email, reason }).onConflictDoNothing();
      await tx
        .update(emailSubscribers)
        .set({ status, unsubscribedAt: sql`now()` })
        .where(eq(emailSubscribers.email, email));
    };
    if (type === "email.bounced" && isPermanentBounce(evt.data))
      await suppress("bounce", "bounced");
    if (type === "email.complained") await suppress("complaint", "complained");
  });
  return NextResponse.json({ ok: true });
}
