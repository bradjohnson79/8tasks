/** Canonical public origin. Canonical URLs always point here, never to preview hosts. */
export const SITE_URL = "https://8tasks.com";

/** Static public routes for the sitemap (dynamic ones are added from the database). */
export const STATIC_ROUTES = [
  "/",
  "/missions",
  "/providers",
  "/daily-8",
  "/about",
  "/contact",
  "/press",
  "/for-brands",
  "/submit-provider",
  "/legal/affiliate-disclosure",
  "/legal/earning-disclaimer",
  "/legal/free-access",
  "/legal/privacy",
  "/legal/terms",
];

/** Who runs 8Tasks (founder-confirmed 2026-11-27). No street address is published. */
export const OPERATOR = {
  legalName: "ANOINT Inc.",
  locality: "Langley",
  region: "British Columbia",
  regionCode: "BC",
  country: "Canada",
  email: "8tasks@proton.me",
} as const;
