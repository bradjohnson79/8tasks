import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/affiliates/postbacks";
import { runScheduledEmails } from "@/lib/email/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Hourly Vercel Cron (vercel.json). Requires Authorization: Bearer $CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return new NextResponse(null, { status: 401 });
  }
  const summary = await runScheduledEmails();
  return NextResponse.json({ ok: true, summary });
}
