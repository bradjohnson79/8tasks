import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withPublicDb } from "@/db/client";

export const dynamic = "force-dynamic";
const uuid = z.string().uuid();

/**
 * Email click redirect. Logs the click (only if that listing was in that email) and sends the
 * reader to the 8Tasks listing page, never to a URL from the request. Affiliate redirection
 * still happens only via /go from the site, preserving existing attribution rules.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sendId: string; oppId: string }> },
) {
  const { sendId, oppId } = await params;
  const headers = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
  if (!uuid.safeParse(sendId).success || !uuid.safeParse(oppId).success)
    return NextResponse.redirect(new URL("/missions", req.nextUrl.origin), {
      status: 302,
      headers,
    });
  try {
    await withPublicDb((tx) =>
      tx.execute(sql`select email_record_click(${sendId}::uuid, ${oppId}::uuid)`),
    );
  } catch (err) {
    console.error("email click log failed", (err as Error).message);
  }
  const dest = new URL(`/missions/${oppId}`, req.nextUrl.origin);
  dest.searchParams.set("utm_source", "email");
  dest.searchParams.set("utm_medium", "email");
  dest.searchParams.set("utm_campaign", "daily8");
  return NextResponse.redirect(dest, { status: 302, headers });
}
