import { PATHWAYS, type PathwaySlug } from "@/lib/taxonomy";
import { sortableAmount } from "./compensation";
import type { Opportunity } from "./types";

/**
 * Discovery filters (design spec §13, update §14). Every test returns true only when the
 * data positively supports it — unknown values never match. A filter is enabled in the UI
 * only when at least one listing in the current set matches it.
 */

export type FilterContext = {
  /** User-selected region for "Nearby" (no GPS). */
  location?: { country?: string; region?: string; city?: string };
  now?: Date;
};

export type FilterGroup =
  "quick" | "location" | "time" | "compensation" | "requirements" | "pathways";

export type FilterDef = {
  id: string;
  label: string;
  group: FilterGroup;
  test: (o: Opportunity, ctx: FilterContext) => boolean;
  /** Explains a disabled chip. */
  disabledHint?: string;
};

const NEW_WINDOW_DAYS = 14;
const isRecurring = (o: Opportunity) =>
  (o.compensation.type === "commission" && o.compensation.recurring) ||
  o.attributes.recurringCommission === true;

export function pathwaysFor(o: Opportunity): PathwaySlug[] {
  return PATHWAYS.filter((p) => {
    if (p.categories.includes(o.categorySlug)) return true;
    if (o.subcategorySlug && p.subcategories.includes(o.subcategorySlug)) return true;
    if (p.slug === "local-missions" && o.attributes.inPerson === true) return true;
    if (p.slug === "quick-earnings" && o.durationMinutes !== undefined && o.durationMinutes <= 15)
      return true;
    if (p.slug === "recurring-income" && isRecurring(o)) return true;
    return false;
  }).map((p) => p.slug);
}

export function matchesLocation(o: Opportunity, loc: FilterContext["location"]): boolean {
  if (!loc?.country || !o.locations?.length) return false;
  return o.locations.some(
    (l) =>
      l.country === loc.country &&
      (!loc.region || l.region === loc.region) &&
      (!loc.city || !l.city || l.city.toLowerCase() === loc.city.toLowerCase()),
  );
}

const within = (max: number) => (o: Opportunity) =>
  o.durationMinutes !== undefined && o.durationMinutes <= max;

export const FILTERS: FilterDef[] = [
  // Home chips (design spec §13)
  { id: "for-you", label: "For You", group: "quick", test: () => true },
  {
    id: "from-home",
    label: "From Home",
    group: "quick",
    test: (o) => o.attributes.remote === true,
  },
  {
    id: "nearby",
    label: "Nearby",
    group: "quick",
    test: (o, ctx) => matchesLocation(o, ctx.location),
    disabledHint: "Choose your city or region on a Local Missions page first",
  },
  { id: "quick-tasks", label: "Quick Tasks", group: "quick", test: within(15) },
  {
    id: "highest-paying",
    label: "Highest Paying",
    group: "quick",
    test: (o) => sortableAmount(o.compensation) !== undefined,
  },
  {
    id: "new",
    label: "New",
    group: "quick",
    test: (o, ctx) =>
      (ctx.now ?? new Date()).getTime() - new Date(o.createdAt).getTime() <
      NEW_WINDOW_DAYS * 86_400_000,
  },

  // Location
  {
    id: "in-person",
    label: "In Person",
    group: "location",
    test: (o) => o.attributes.inPerson === true,
  },
  { id: "online", label: "Online", group: "location", test: (o) => o.attributes.online === true },

  // Time
  { id: "under-15", label: "Under 15 Minutes", group: "time", test: within(15) },
  { id: "under-30", label: "Under 30 Minutes", group: "time", test: within(30) },
  { id: "under-60", label: "Under 1 Hour", group: "time", test: within(60) },
  {
    id: "longer",
    label: "Longer Assignments",
    group: "time",
    test: (o) => o.durationMinutes !== undefined && o.durationMinutes > 60,
  },

  // Compensation
  {
    id: "fixed",
    label: "Fixed Payment",
    group: "compensation",
    test: (o) => o.compensation.type === "fixed",
  },
  {
    id: "range",
    label: "Payment Range",
    group: "compensation",
    test: (o) => o.compensation.type === "range",
  },
  {
    id: "hourly",
    label: "Hourly Payment",
    group: "compensation",
    test: (o) => o.compensation.type === "hourly",
  },
  {
    id: "reimbursement",
    label: "Reimbursement",
    group: "compensation",
    test: (o) =>
      o.compensation.type === "reimbursement_only" ||
      o.compensation.type === "payment_plus_reimbursement" ||
      o.attributes.reimbursementAvailable === true,
  },
  {
    id: "commission",
    label: "Commission-Based",
    group: "compensation",
    test: (o) =>
      o.compensation.type === "commission" ||
      o.compensation.type === "hybrid" ||
      o.attributes.performanceBased === true,
  },
  {
    id: "recurring",
    label: "Recurring Commission Potential",
    group: "compensation",
    test: isRecurring,
  },

  // Requirements
  {
    id: "beginner",
    label: "Beginner Friendly",
    group: "requirements",
    test: (o) => o.attributes.beginnerFriendly === true,
  },
  {
    id: "no-purchase",
    label: "No Purchase Required",
    group: "requirements",
    test: (o) => o.attributes.purchaseRequired === false,
  },
  {
    id: "smartphone-only",
    label: "Smartphone Only",
    group: "requirements",
    test: (o) =>
      o.attributes.smartphoneRequired === true && o.attributes.computerRequired === false,
  },
  {
    id: "no-audience",
    label: "No Existing Audience Required",
    group: "requirements",
    test: (o) => o.attributes.audienceRequired === false,
  },
  {
    id: "portfolio",
    label: "Portfolio Required",
    group: "requirements",
    test: (o) => o.attributes.portfolioRequired === true,
  },

  // Pathways (update §4)
  ...PATHWAYS.map((p): FilterDef => ({
    id: p.slug,
    label: p.title,
    group: "pathways",
    test: (o) => pathwaysFor(o).includes(p.slug),
  })),
];

export const FILTER_BY_ID = Object.fromEntries(FILTERS.map((f) => [f.id, f]));

export const FILTER_GROUP_LABELS: Record<FilterGroup, string> = {
  quick: "Discover",
  location: "Location",
  time: "Time",
  compensation: "Compensation",
  requirements: "Requirements",
  pathways: "Ways to earn",
};

/** "Nearby" uses the location; the advanced panel repeats From Home under Location. */
export const ADVANCED_GROUPS: { group: FilterGroup; ids: string[] }[] = [
  { group: "location", ids: ["from-home", "nearby", "in-person", "online"] },
  { group: "time", ids: ["under-15", "under-30", "under-60", "longer"] },
  {
    group: "compensation",
    ids: ["fixed", "range", "hourly", "reimbursement", "commission", "recurring"],
  },
  {
    group: "requirements",
    ids: ["beginner", "no-purchase", "smartphone-only", "no-audience", "portfolio"],
  },
  { group: "pathways", ids: PATHWAYS.map((p) => p.slug) },
];

export const HOME_CHIPS = [
  "for-you",
  "from-home",
  "nearby",
  "quick-tasks",
  "highest-paying",
  "new",
];

// ---------------------------------------------------------------------------
// Search (design spec §10): deterministic keyword search over real fields.
// ---------------------------------------------------------------------------
const STOPWORDS = new Set(
  "a an and are at be by can complete do doing earn earning extra find for from get i in is it job jobs join make me money my near of on or paid pay some take the to try want what with work would you".split(
    " ",
  ),
);

/** Words added to a listing's searchable text based on verified attributes. */
function derivedKeywords(o: Opportunity): string[] {
  const words: string[] = [];
  if (o.attributes.remote) words.push("home", "remote", "online");
  if (o.attributes.inPerson) words.push("local", "nearby", "person", "community");
  if (o.attributes.smartphoneRequired) words.push("phone", "mobile", "smartphone");
  if (o.durationMinutes !== undefined && o.durationMinutes <= 15) words.push("quick", "short");
  for (const p of pathwaysFor(o)) words.push(...p.split("-"));
  return words;
}

const stem = (w: string) => w.replace(/(ing|es|s)$/, "");

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);
}

export function matchesSearch(o: Opportunity, q: string): boolean {
  const tokens = tokenize(q);
  if (tokens.length === 0) return true;
  const hay = [
    o.title,
    o.summary ?? "",
    o.providerName,
    o.categoryName,
    o.subcategorySlug?.replace(/-/g, " ") ?? "",
    ...derivedKeywords(o),
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(stem);
  return tokens.every((t) =>
    hay.some((w) => w.startsWith(t) || (w.length >= 4 && t.startsWith(w))),
  );
}

// ---------------------------------------------------------------------------
// Applying filters
// ---------------------------------------------------------------------------
export type DiscoveryQuery = {
  q?: string;
  filters?: string[];
  category?: string;
  /** Subcategory slugs from a category tab. */
  subcategories?: string[];
};

export function applyDiscovery(
  items: Opportunity[],
  query: DiscoveryQuery,
  ctx: FilterContext = {},
): Opportunity[] {
  const active = (query.filters ?? []).map((id) => FILTER_BY_ID[id]).filter(Boolean);
  let out = items.filter(
    (o) =>
      (!query.category || o.categorySlug === query.category) &&
      (!query.subcategories?.length ||
        (o.subcategorySlug && query.subcategories.includes(o.subcategorySlug))) &&
      (!query.q || matchesSearch(o, query.q)) &&
      active.every((f) => f.test(o, ctx)),
  );
  if (query.filters?.includes("highest-paying")) {
    out = [...out].sort(
      (a, b) => (sortableAmount(b.compensation) ?? 0) - (sortableAmount(a.compensation) ?? 0),
    );
  } else if (query.filters?.includes("new")) {
    out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  return out;
}

/** Which filters have at least one matching listing in `items` (so the chip can be enabled). */
export function availableFilters(items: Opportunity[], ctx: FilterContext = {}): Set<string> {
  const set = new Set<string>();
  for (const f of FILTERS) if (items.some((o) => f.test(o, ctx))) set.add(f.id);
  return set;
}
