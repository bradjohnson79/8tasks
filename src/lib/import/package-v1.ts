import { CATEGORY_SEED } from "../../../scripts/seed-data";
import { DEFAULT_PATHWAYS, DEFAULT_SUBSECTIONS } from "@/lib/discovery/defaults";
import { ATTRIBUTE_KEYS } from "@/lib/missions/types";

/**
 * Adapter for the founder's "claude_integration_package.json" format
 * (providers[].provider_id + public/internal blocks with human annotations such as
 * "stock-licensing (NEW — add)"). Converts it into the native import shape validated by
 * provider-import.ts. Unknown, null or non-boolean facts are dropped (never guessed).
 */
type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter(Boolean) : []);
/** "stock-licensing (NEW — add)" → "stock-licensing" */
const leadSlug = (v: string) => v.match(/^[a-z0-9]+(?:-[a-z0-9]+)*/)?.[0] ?? "";
/** "licensing_royalties (NEW — until added use …)" → "licensing_royalties" */
const leadWord = (v: string) => v.match(/^[a-z_]+/)?.[0] ?? "";
const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const SUB_TO_CATEGORY = new Map<string, string>();
for (const c of CATEGORY_SEED) for (const s of c.subcategories) SUB_TO_CATEGORY.set(s.slug, c.slug);

/** Attribute names used in the package that differ from ours. */
const ATTR_ALIASES: Record<string, string> = {
  photographicDeliverable: "photoDeliverable",
  publicContentPublication: "publicPublication",
};

const CAPABILITY = (v: unknown) => {
  const w = str(v).toLowerCase().split(/\s|\(/)[0];
  return w === "yes" || w === "no" ? w : "unknown";
};

export function isIntegrationPackage(data: unknown): boolean {
  return (
    isObj(data) &&
    Array.isArray(data.providers) &&
    data.providers.some((p) => isObj(p) && "provider_id" in p && isObj(p.public))
  );
}

export function fromIntegrationPackage(data: Obj): { providers: Obj[] } {
  const providers = (data.providers as unknown[]).filter(isObj).map((p) => {
    const pub = isObj(p.public) ? p.public : {};
    const int = isObj(p.internal) ? p.internal : {};
    const slug = str(pub.slug) || str(p.provider_id);
    const primary = str(pub.primary_category);
    const subs = strs(pub.subcategories).map(leadSlug).filter(Boolean);
    const primarySub = subs.find((s) => SUB_TO_CATEGORY.get(s) === primary) ?? null;
    const secondary = [
      ...strs(pub.additional_categories).map((c) => ({ category: leadSlug(c), subcategory: null })),
      ...subs
        .filter((s) => s !== primarySub && SUB_TO_CATEGORY.has(s))
        .map((s) => ({ category: SUB_TO_CATEGORY.get(s)!, subcategory: s })),
    ];
    const subsections = strs(pub.specialized_subsections)
      .map(
        (name) =>
          DEFAULT_SUBSECTIONS.find((g) => g.title.toLowerCase() === name.toLowerCase())?.slug ??
          slugify(name),
      )
      .filter(Boolean);
    const pathways = strs(pub.discovery_pathways).filter((s) =>
      DEFAULT_PATHWAYS.some((g) => g.slug === s),
    );

    const attributes: Record<string, boolean> = {};
    if (isObj(pub.attributes))
      for (const [k, v] of Object.entries(pub.attributes)) {
        const key = ATTR_ALIASES[k] ?? k;
        if (typeof v === "boolean" && (ATTRIBUTE_KEYS as readonly string[]).includes(key))
          attributes[key] = v;
      }

    const comp = isObj(pub.compensation) ? pub.compensation : {};
    const compType = leadWord(str(comp.type)) || "unknown";
    const types = strs(pub.opportunity_types);
    const title = types[0] || `${str(pub.name)} opportunity`;
    const link = isObj(int.affiliate_link) ? int.affiliate_link : {};
    const caps = isObj(int.capabilities) ? int.capabilities : {};
    const model = str(int.commercial_commission_model);
    const amount = str(int.commercial_commission_amount);

    // Everything that is admin-only context goes to providers.admin_notes (never rendered).
    const notes = [
      int.attribution_requirements && `Attribution: ${str(int.attribution_requirements)}`,
      int.creator_compatibility && `Creator compatibility: ${str(int.creator_compatibility)}`,
      int.reporting && `Reporting: ${str(int.reporting)}`,
      int.payout_note && `Payout: ${str(int.payout_note)}`,
      int.brand_referral_link && `Brand referral link: ${str(int.brand_referral_link)}`,
      pub.logo_note && `Logo: ${str(pub.logo_note)}`,
      pub.countries_note && `Countries: ${str(pub.countries_note)}`,
      strs(int.do_not).length && `Do not: ${strs(int.do_not).join("; ")}`,
      strs(int.needs_account_check).length &&
        `Needs account check: ${strs(int.needs_account_check).join("; ")}`,
      strs(int.source_urls).some((u) => !/^https:\/\//.test(u)) &&
        `Other sources: ${strs(int.source_urls)
          .filter((u) => !/^https:\/\//.test(u))
          .join("; ")}`,
    ].filter(Boolean);

    return {
      slug,
      public: {
        name: str(pub.name),
        website_url: str(pub.website_url) || null,
        summary: str(pub.summary) || null,
        description: str(pub.description) || null,
        countries: strs(pub.countries),
        last_verified_at: str(int.last_verified) || null,
        affiliate_url: str(link.destination_url) || null,
        affiliate_label: str(link.label) || null,
        opportunities: [
          {
            slug: slugify(title) || `${slug}-opportunity`,
            title,
            summary: str(pub.summary) || null,
            description: types.length > 1 ? `Includes: ${types.join(", ")}.` : null,
            category: primary,
            subcategory: primarySub,
            secondary,
            subsections,
            pathways,
            compensation_type: compType,
            // The display line only adds information for "varies" style pay.
            compensation_note: compType === "variable" ? str(comp.display) || null : null,
            attributes,
            eligibility: str(pub.user_requirements) ? [str(pub.user_requirements)] : [],
          },
        ],
      },
      internal: {
        commission_model: /business-client/i.test(model) ? "business_client_referral" : "unknown",
        commission_text: [model, amount].filter(Boolean).join(": ") || null,
        commission_currency: /US\$/.test(amount) ? "USD" : null,
        tracking_window: (amount.match(/(\d+-day[^;,.]*)/) ?? [])[1] ?? null,
        recurring_commission: null,
        source_urls: strs(int.source_urls).filter((u) => /^https:\/\//.test(u)),
        readiness_level: null,
        approval_status: str(int.approval_status) || null,
        mission_alignment: null,
        business_contact: null,
        admin_notes: notes.join("\n") || null,
        capabilities: {
          supports_sub_ids: CAPABILITY(caps.supports_sub_ids),
          supports_postbacks: CAPABILITY(caps.supports_postbacks),
          provides_feed: CAPABILITY(caps.provides_feed),
          allows_revenue_share: CAPABILITY(caps.allows_revenue_share),
        },
        affiliate_network: str(int.affiliate_network) || null,
      },
    };
  });
  return { providers };
}
