import type { DiscoveryGroup } from "@/lib/discovery/defaults";
import { belongsTo, categoriesOf } from "@/lib/discovery/membership";
import { matchesLocation, matchesSearch } from "@/lib/missions/filters";
import { isClosed } from "@/lib/missions/metadata";
import type { Opportunity } from "@/lib/missions/types";

/**
 * My Daily 8: rules-based picks (no AI). Never pads to eight: returns only listings that
 * pass every hard rule, and asks the caller to skip the email when nothing new is left.
 */
export type SubscriberPrefs = {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  categories: string[];
  creativeInterests: string[];
  workMode: "any" | "remote" | "local";
  beginnerOnly: boolean;
  /** Equipment the subscriber has (smartphone, computer, camera). Empty = not stated. */
  equipment: string[];
  compensationTypes: string[];
  searchQuery?: string | null;
};

export type Daily8Result =
  { send: true; items: Opportunity[] } | { send: false; reason: "no_matches" | "nothing_new" };

export const DAILY8_MAX = 8;
const DAY = 86_400_000;

/** Hard rules. Unknown facts never count as meeting a requirement. */
export function eligible(
  o: Opportunity,
  prefs: SubscriberPrefs,
  subsections: DiscoveryGroup[],
  now: Date,
) {
  if (o.isDemo || !o.hasOutboundLink || isClosed(o, now)) return false;
  if (o.emailAllowed !== true) return false; // provider must allow email-originated traffic
  // Geography: launch markets, and the subscriber's country when given.
  if (
    prefs.country
      ? !o.countries.includes(prefs.country)
      : !o.countries.some((c) => c === "CA" || c === "US")
  )
    return false;
  const a = o.attributes;
  if (prefs.workMode === "remote" && a.remote !== true) return false;
  if (prefs.workMode === "local") {
    if (!(a.inPerson || a.localAssignment)) return false;
    if (prefs.country && o.locations?.length) {
      const loc = {
        country: prefs.country,
        region: prefs.region ?? undefined,
        city: prefs.city ?? undefined,
      };
      if (!matchesLocation(o, loc)) return false;
    }
  }
  if (prefs.beginnerOnly && a.beginnerFriendly !== true) return false;
  if (prefs.equipment.length) {
    const has = (e: string) => prefs.equipment.includes(e);
    if (a.cameraRequired && !has("camera")) return false;
    if (a.computerRequired && !has("computer")) return false;
    if (a.smartphoneRequired && !has("smartphone")) return false;
  }
  if (prefs.compensationTypes.length && !prefs.compensationTypes.includes(o.compensation.type))
    return false;
  // Interests: when any are chosen, a listing must match at least one.
  if (prefs.categories.length || prefs.creativeInterests.length) {
    const cat = categoriesOf(o).some((c) => prefs.categories.includes(c));
    const interest = subsections
      .filter((g) => prefs.creativeInterests.includes(g.slug))
      .some((g) => belongsTo(o, g));
    if (!cat && !interest) return false;
  }
  return true;
}

function score(
  o: Opportunity,
  prefs: SubscriberPrefs,
  subsections: DiscoveryGroup[],
  recent: Set<string>,
  now: Date,
) {
  let s = 0;
  if (now.getTime() - new Date(o.createdAt).getTime() < 7 * DAY) s += 3;
  if (o.isFeatured) s += 2;
  if (o.lastVerifiedAt && now.getTime() - Date.parse(o.lastVerifiedAt) < 30 * DAY) s += 1;
  if (categoriesOf(o).some((c) => prefs.categories.includes(c))) s += 2;
  if (
    subsections.filter((g) => prefs.creativeInterests.includes(g.slug)).some((g) => belongsTo(o, g))
  )
    s += 2;
  if (prefs.searchQuery && matchesSearch(o, prefs.searchQuery)) s += 2;
  if (recent.has(o.id)) s -= 4; // avoid repeating the same picks day after day
  return s;
}

export function recommendDaily8(
  prefs: SubscriberPrefs,
  candidates: Opportunity[],
  opts: {
    subsections: DiscoveryGroup[];
    /** Opportunity ids emailed to this subscriber in the last 7 days. */
    recentlySent: string[];
    /** Ids in the subscriber's previous email. */
    lastSent: string[];
    now?: Date;
    max?: number;
  },
): Daily8Result {
  const now = opts.now ?? new Date();
  const recent = new Set(opts.recentlySent);
  const pool = candidates
    .filter((o) => eligible(o, prefs, opts.subsections, now))
    .map((o) => ({ o, s: score(o, prefs, opts.subsections, recent, now) }))
    .sort(
      (a, b) =>
        b.s - a.s || b.o.createdAt.localeCompare(a.o.createdAt) || a.o.id.localeCompare(b.o.id),
    );

  // One listing per provider, so eight picks are eight different places to earn.
  const seen = new Set<string>();
  const items: Opportunity[] = [];
  for (const { o } of pool) {
    const key = o.providerSlug ?? o.providerName;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(o);
    if (items.length >= (opts.max ?? DAILY8_MAX)) break;
  }
  if (!items.length) return { send: false, reason: "no_matches" };
  const last = new Set(opts.lastSent);
  if (items.every((o) => last.has(o.id))) return { send: false, reason: "nothing_new" };
  return { send: true, items };
}

export function daily8Intro(count: number, variant: "daily" | "weekly"): string {
  const when = variant === "daily" ? "today" : "this week";
  const base = `Here ${count === 1 ? "is 1 opportunity" : `are ${count} opportunities`} picked for your preferences ${when}.`;
  return count < DAILY8_MAX
    ? `${base} We only include listings we've checked, so some days there are fewer than eight.`
    : base;
}
