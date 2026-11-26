import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { withPublicDb } from "@/db/client";

export const dynamic = "force-dynamic";
const token = z.string().uuid();

/** RFC 8058 one-click unsubscribe (List-Unsubscribe-Post). Mail clients POST here. */
export async function POST(req: NextRequest) {
  const t = token.safeParse(req.nextUrl.searchParams.get("token"));
  if (t.success) {
    await withPublicDb((tx) => tx.execute(sql`select email_unsubscribe(${t.data}::uuid)`));
  }
  return new NextResponse(null, { status: 200 });
}

/** A plain GET never unsubscribes (link scanners); it shows the confirmation page. */
export async function GET(req: NextRequest) {
  const t = req.nextUrl.searchParams.get("token") ?? "";
  const url = new URL("/email/unsubscribe", req.nextUrl.origin);
  if (token.safeParse(t).success) url.searchParams.set("token", t);
  return NextResponse.redirect(url, 303);
}
