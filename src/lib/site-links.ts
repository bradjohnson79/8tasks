import { z } from "zod";
import raw from "../../data/site_links.json";

/**
 * Founder's link map (built by build_site_links.py from affiliate_overrides.csv).
 * Accepts either a bare array or { providers: [...] }. CSV-style semicolon lists are
 * also accepted for audience/placement. Invalid rows are dropped, never guessed.
 */
const list = z.preprocess(
  (v) =>
    typeof v === "string"
      ? v
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean)
      : (v ?? []),
  z.array(z.string()),
);
const httpsOrEmpty = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && /^https:\/\/[^\s]+$/.test(v) ? v : ""));

export const siteLinkSchema = z
  .object({
    provider_id: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    name: z.string().trim().optional(),
    /** Display name in the current builder output (older copies used "name"). */
    provider: z.string().trim().optional(),
    status: z.string().trim(),
    affiliate_url: httpsOrEmpty,
    sample_url: httpsOrEmpty,
    commission_note: z.string().optional(),
    disclosure_needed: z.string().optional(),
    audience: list.default(["earners"]),
    placement: list.default(["directory"]),
  })
  .transform(({ provider, ...r }) => ({ ...r, name: r.name ?? provider }));

export type SiteLink = z.infer<typeof siteLinkSchema>;

export function parseSiteLinks(data: unknown): SiteLink[] {
  const rows = Array.isArray(data) ? data : ((data as { providers?: unknown[] })?.providers ?? []);
  return rows.flatMap((r) => {
    const p = siteLinkSchema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

/**
 * Earner directory rule from the link map: placement includes directory and status is sample
 * or live. founder_review_pending / excluded rows are never returned.
 */
export function directoryLinks(links: SiteLink[]): SiteLink[] {
  return links.filter(
    (l) => l.placement.includes("directory") && (l.status === "live" || l.status === "sample"),
  );
}

/** For Brands page: placement includes for_brands_page AND status is live (spec). */
export function forBrandsOffers(links: SiteLink[]): (SiteLink & { href: string })[] {
  return links
    .filter((l) => l.status === "live" && l.placement.includes("for_brands_page"))
    .map((l) => ({ ...l, href: l.affiliate_url || l.sample_url }))
    .filter((l) => l.href !== "");
}

export const SITE_LINKS = parseSiteLinks(raw);
