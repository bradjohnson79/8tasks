import { REGIONS } from "@/lib/taxonomy";
import { matchesLocation } from "./filters";
import type { Opportunity } from "./types";

export type LocationQuery = { country?: "CA" | "US"; region?: string; city?: string };

/** Validates user-entered location params against known countries/regions. */
export function parseLocation(
  country?: string,
  region?: string,
  city?: string,
): LocationQuery | undefined {
  // A region implies its country when the country wasn't chosen.
  let c: "CA" | "US" | undefined = country === "CA" || country === "US" ? country : undefined;
  if (!c && region) {
    c = REGIONS.CA.some((r) => r.code === region)
      ? "CA"
      : REGIONS.US.some((r) => r.code === region)
        ? "US"
        : undefined;
  }
  if (!c) return undefined;
  const r = region && REGIONS[c].some((x) => x.code === region) ? region : undefined;
  const cleanCity =
    city
      ?.replace(/[^\p{L}\s.'-]/gu, "")
      .trim()
      .slice(0, 60) || undefined;
  return { country: c, region: r, city: r ? cleanCity : undefined };
}

/**
 * Listings for a chosen area: missions located there, plus providers that operate in the
 * area or across the country. Never invents nearby assignments (design update §8).
 */
export function inArea(o: Opportunity, loc: LocationQuery): boolean {
  if (o.locations?.length) return matchesLocation(o, loc);
  return o.countries.includes(loc.country!);
}

export function describeLocation(loc: LocationQuery): string {
  const regionName = loc.region
    ? REGIONS[loc.country!].find((r) => r.code === loc.region)?.name
    : undefined;
  return [loc.city, regionName, loc.country === "CA" ? "Canada" : "United States"]
    .filter(Boolean)
    .join(", ");
}
