import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { resolveOpportunityRedirect } from "@/db/queries/public";
import { serverEnv } from "@/lib/env";
import { resolveSiteUrls } from "@/lib/site-url";
import {
  countryFromHeader,
  deviceTypeFromUA,
  isBotUA,
  sourcePathFromReferer,
} from "@/lib/redirect/request-meta";

export const dynamic = "force-dynamic";

const idSchema = z.string().uuid();

/**
 * Affiliate redirect (CLAUDE.md rule 2). The destination always comes from the
 * database (admin-stored affiliate_links); nothing from the request is used as a URL.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse((await params).id);
  const headers = {
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (!parsed.success) return new NextResponse("Not found", { status: 404, headers });

  const ua = req.headers.get("user-agent");
  const url = await resolveOpportunityRedirect(parsed.data, {
    sourcePath: sourcePathFromReferer(
      req.headers.get("referer"),
      resolveSiteUrls(serverEnv()).trustedOrigins,
    ),
    country: countryFromHeader(req.headers.get("x-vercel-ip-country")),
    deviceType: deviceTypeFromUA(ua),
    isBot: isBotUA(ua),
  });

  // Belt and braces: the DB already enforces https destinations.
  if (!url || !url.startsWith("https://"))
    return new NextResponse("Not found", { status: 404, headers });
  return NextResponse.redirect(url, { status: 302, headers });
}
