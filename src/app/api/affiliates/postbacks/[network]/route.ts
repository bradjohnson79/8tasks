import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { runtimeDb } from "@/db/client";
import {
  parsePostback,
  POSTBACK_NETWORKS,
  safeEqual,
  type PostbackNetwork,
} from "@/lib/affiliates/postbacks";
import { allow } from "@/lib/affiliates/rate-limit";

export const dynamic = "force-dynamic";

const HEADERS = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };
const reply = (status: number) =>
  new NextResponse(status < 300 ? "ok" : null, { status, headers: HEADERS });

/**
 * Inbound affiliate postbacks (spec §4.1). Authenticated by AFFILIATE_POSTBACK_SECRET sent
 * as ?key= or the x-postback-key header — never by the admin session. Idempotent: writes go
 * through record_affiliate_postback(), which upserts on (program, external id).
 * Never logs the URL, headers or secret.
 */
async function handle(req: NextRequest, network: string) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allow(`pb:${ip}`)) return reply(429);
  if (!POSTBACK_NETWORKS.includes(network as PostbackNetwork)) return reply(404);

  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => (params[k] = v));
  if (req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    try {
      if (type.includes("application/json")) {
        const body = (await req.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body ?? {}))
          if (v !== null && typeof v !== "object") params[k] = String(v);
      } else if (type.includes("form")) {
        (await req.formData()).forEach((v, k) => typeof v === "string" && (params[k] = v));
      }
    } catch {
      return reply(400);
    }
  }

  const secret = process.env.AFFILIATE_POSTBACK_SECRET;
  const given = req.headers.get("x-postback-key") ?? params.key ?? "";
  if (!secret || secret.length < 24 || !safeEqual(given, secret)) return reply(403);

  const pb = parsePostback(network as PostbackNetwork, params);
  if (!pb.externalId || !pb.currency || (!pb.programId && !pb.campaignId)) return reply(422);

  const res = await runtimeDb().execute<{ result: string }>(sql`
    select record_affiliate_postback(
      ${pb.programId ?? null}, ${network === "generic" ? null : network}, ${pb.campaignId ?? null},
      ${pb.externalId}, ${pb.clickId ?? null}, ${pb.status}::affiliate_tx_status,
      ${pb.commission ?? 0}, ${pb.sale ?? null}, ${pb.currency}, ${pb.eventAt?.toISOString() ?? null}::timestamptz,
      ${JSON.stringify(pb.raw)}::jsonb
    ) as result`);
  const result = res.rows[0]?.result;
  // Unknown programs get 202 so networks don't retry forever; the run is logged for Brad.
  return reply(result === "inserted" || result === "updated" ? 200 : 202);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ network: string }> }) {
  return handle(req, (await ctx.params).network);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ network: string }> }) {
  return handle(req, (await ctx.params).network);
}
