import { NextResponse, type NextRequest } from "next/server";
import { safeEqual } from "@/lib/affiliates/postbacks";
import { runScheduledSync } from "@/lib/affiliates/sync";

export const dynamic = "force-dynamic";

/** Vercel Cron (vercel.json): sends Authorization: Bearer $CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) {
    return new NextResponse(null, { status: 401 });
  }
  const results = await runScheduledSync();
  return NextResponse.json({ ok: true, results });
}
