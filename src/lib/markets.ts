/**
 * Launch markets (founder decision 2026-11-26): Canada and the United States only.
 * To expand internationally, add ISO 3166-1 alpha-2 codes here. Admin validation and
 * public listing filters both read from this list.
 */
export const SUPPORTED_COUNTRIES = ["CA", "US"] as const;
export type SupportedCountry = (typeof SUPPORTED_COUNTRIES)[number];

export const COUNTRY_LABELS: Record<SupportedCountry, string> = {
  CA: "Canada",
  US: "United States",
};

export function isSupportedCountry(code: string): code is SupportedCountry {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code);
}
