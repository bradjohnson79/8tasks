/**
 * Central discovery configuration (design spec §12, update §4–8, §17).
 * Page components read from here instead of hardcoding opportunity types.
 * Category names/descriptions/order themselves come from the database (admin-editable);
 * this file adds presentation details and cross-category groupings.
 */
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Camera,
  Clapperboard,
  ClipboardList,
  Gamepad2,
  MessagesSquare,
  ShoppingBag,
  Smartphone,
} from "lucide-react";

export type CategoryDisplay = {
  /** Short label for the 4-across mobile grid; full name stays in aria-label and on the page. */
  shortName: string;
  icon: LucideIcon;
  accent: string;
};

export const CATEGORY_DISPLAY: Record<string, CategoryDisplay> = {
  surveys: { shortName: "Surveys", icon: ClipboardList, accent: "#7DB8FF" },
  "app-website-testing": { shortName: "Testing", icon: Smartphone, accent: "#A99BFA" },
  photography: { shortName: "Photos", icon: Camera, accent: "#F6BE78" },
  "mystery-shopping": { shortName: "Shopping", icon: ShoppingBag, accent: "#F59DA6" },
  "content-media": { shortName: "Media", icon: Clapperboard, accent: "#68D8DB" },
  "gaming-entertainment": { shortName: "Gaming", icon: Gamepad2, accent: "#B5A0F5" },
  "paid-research": { shortName: "Research", icon: MessagesSquare, accent: "#8BD6A7" },
  "microtasks-ai": { shortName: "AI Tasks", icon: BrainCircuit, accent: "#91B4ED" },
};

export const FALLBACK_CATEGORY_DISPLAY: CategoryDisplay = {
  shortName: "Other",
  icon: ClipboardList,
  accent: "#9DAABD",
};

export function categoryDisplay(slug: string): CategoryDisplay {
  return CATEGORY_DISPLAY[slug] ?? FALLBACK_CATEGORY_DISPLAY;
}

// Pathways, category tabs and /earn subsections now live in the admin-managed
// `discovery_groups` table (src/lib/discovery). Defaults: src/lib/discovery/defaults.ts.
export { DEFAULT_PATHWAYS as PATHWAYS } from "./discovery/defaults";
export type { DiscoveryGroup as Pathway } from "./discovery/defaults";

/** Categories that show the "Find missions near you" location picker. */
export const LOCATION_CATEGORIES = ["mystery-shopping", "photography"];

export const REGIONS: Record<"CA" | "US", { code: string; name: string }[]> = {
  CA: [
    { code: "AB", name: "Alberta" },
    { code: "BC", name: "British Columbia" },
    { code: "MB", name: "Manitoba" },
    { code: "NB", name: "New Brunswick" },
    { code: "NL", name: "Newfoundland and Labrador" },
    { code: "NS", name: "Nova Scotia" },
    { code: "ON", name: "Ontario" },
    { code: "PE", name: "Prince Edward Island" },
    { code: "QC", name: "Quebec" },
    { code: "SK", name: "Saskatchewan" },
    { code: "NT", name: "Northwest Territories" },
    { code: "NU", name: "Nunavut" },
    { code: "YT", name: "Yukon" },
  ],
  US: [
    "AL Alabama",
    "AK Alaska",
    "AZ Arizona",
    "AR Arkansas",
    "CA California",
    "CO Colorado",
    "CT Connecticut",
    "DE Delaware",
    "DC District of Columbia",
    "FL Florida",
    "GA Georgia",
    "HI Hawaii",
    "ID Idaho",
    "IL Illinois",
    "IN Indiana",
    "IA Iowa",
    "KS Kansas",
    "KY Kentucky",
    "LA Louisiana",
    "ME Maine",
    "MD Maryland",
    "MA Massachusetts",
    "MI Michigan",
    "MN Minnesota",
    "MS Mississippi",
    "MO Missouri",
    "MT Montana",
    "NE Nebraska",
    "NV Nevada",
    "NH New Hampshire",
    "NJ New Jersey",
    "NM New Mexico",
    "NY New York",
    "NC North Carolina",
    "ND North Dakota",
    "OH Ohio",
    "OK Oklahoma",
    "OR Oregon",
    "PA Pennsylvania",
    "RI Rhode Island",
    "SC South Carolina",
    "SD South Dakota",
    "TN Tennessee",
    "TX Texas",
    "UT Utah",
    "VT Vermont",
    "VA Virginia",
    "WA Washington",
    "WV West Virginia",
    "WI Wisconsin",
    "WY Wyoming",
  ].map((s) => ({ code: s.slice(0, 2), name: s.slice(3) })),
};
