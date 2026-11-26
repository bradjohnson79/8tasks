/**
 * Optional card copy per provider_id for the For Brands page. Offers are listed from the
 * link map; copy here only overrides the neutral default. Honesty rules: no traffic,
 * reach or result claims; never call 8Tasks a partner or agent.
 */
export type BrandOfferCopy = {
  heading: string;
  body: string;
  ctaLabel: string;
  disclosure: string;
};

export const BRAND_OFFER_COPY: Record<string, BrandOfferCopy> = {
  joinbrands: {
    heading: "Need UGC creators for your products?",
    body: "Try JoinBrands to find creators for product photos, videos and reviews.",
    ctaLabel: "Try JoinBrands",
    disclosure:
      "8Tasks may earn a referral commission if you sign up through this link. We are an independent referral affiliate, not a JoinBrands partner or agent.",
  },
};

export function copyFor(providerId: string, name: string): BrandOfferCopy {
  return (
    BRAND_OFFER_COPY[providerId] ?? {
      heading: name,
      body: `Visit ${name} to learn what it offers brands.`,
      ctaLabel: `Visit ${name}`,
      disclosure: `8Tasks may earn a referral commission if you sign up through this link. We are an independent referral affiliate, not a ${name} partner or agent.`,
    }
  );
}
