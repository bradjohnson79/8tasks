/**
 * Central discovery configuration (design spec §12, update §4–8, §17).
 * Page components read from here instead of hardcoding opportunity types.
 * Category names/descriptions/order themselves come from the database (admin-editable);
 * this file adds presentation details and cross-category groupings.
 *
 * Next step (documented in docs/DATABASE.md): move pathways and tab groups into
 * admin-managed tables once the visual structure is approved.
 */
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Camera,
  Clapperboard,
  ClipboardList,
  Gamepad2,
  MapPin,
  MessagesSquare,
  Repeat,
  ShoppingBag,
  Smartphone,
  Zap,
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

// ---------------------------------------------------------------------------
// Discovery pathways: cross-category ways to earn (update §4). Not categories.
// ---------------------------------------------------------------------------
export type PathwaySlug = "quick-earnings" | "local-missions" | "create-earn" | "recurring-income";

export type Pathway = {
  slug: PathwaySlug;
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
  /** Shown on the pathway's results page. */
  includes: string[];
  /** Subcategories that always belong to this pathway. */
  subcategories: string[];
  /** Whole categories that belong to this pathway. */
  categories: string[];
};

export const PATHWAYS: Pathway[] = [
  {
    slug: "quick-earnings",
    title: "Quick Earnings",
    description: "Small, simple tasks.",
    icon: Zap,
    accent: "#FBBF24",
    includes: [
      "Surveys",
      "Short video reviews",
      "Quick app tests",
      "Music reviews",
      "Content evaluation",
      "Simple microtasks",
      "Short consumer feedback",
    ],
    categories: ["surveys"],
    subcategories: [
      "video-reviewing",
      "music-reviewing",
      "digital-content-evaluation",
      "consumer-feedback",
      "ad-evaluation",
      "trailer-feedback",
      "ai-evaluation",
      "categorisation",
      "data-labelling",
      "search-evaluation",
      "fact-checking",
    ],
  },
  {
    slug: "local-missions",
    title: "Local Missions",
    description: "Explore your community.",
    icon: MapPin,
    accent: "#7DB8FF",
    includes: [
      "Mystery shopping",
      "Retail audits",
      "Photography assignments",
      "Restaurant evaluations",
      "Product display checks",
      "Automotive evaluations",
      "In-person research",
    ],
    categories: [],
    subcategories: [
      "in-store",
      "dining",
      "coffee-shops",
      "drive-through",
      "hotels-hospitality",
      "automotive",
      "retail-audits",
      "entertainment-venues",
      "display-photography",
      "inventory-verification",
      "pricing-verification",
      "storefronts-locations",
      "shelf-checks",
      "focus-groups",
    ],
  },
  {
    slug: "create-earn",
    title: "Create & Earn",
    description: "Blog, vlog and create.",
    icon: Clapperboard,
    accent: "#B5A0F5",
    includes: [
      "Sponsored blog posts",
      "Freelance content writing",
      "YouTube videos",
      "Product demonstrations",
      "User-generated content",
      "Product photography",
      "Sponsored newsletters",
      "Brand collaborations",
    ],
    categories: [],
    subcategories: [
      "blogging",
      "vlogging",
      "sponsored-articles",
      "content-writing",
      "sponsored-videos",
      "user-generated-content",
      "product-demonstrations",
      "product-unboxing",
      "influencer-collaborations",
      "sponsored-newsletters",
      "product-photos",
    ],
  },
  {
    slug: "recurring-income",
    title: "Recurring Income",
    description: "Affiliate opportunities.",
    icon: Repeat,
    accent: "#53E6A0",
    includes: [
      "Affiliate blogging and vlogging",
      "Publisher networks",
      "Performance-based promotion",
      "Brand ambassador programs",
      "Recurring affiliate commissions",
    ],
    categories: [],
    subcategories: ["affiliate-marketing", "brand-ambassador"],
  },
];

export const PATHWAY_BY_SLUG = Object.fromEntries(PATHWAYS.map((p) => [p.slug, p])) as Record<
  PathwaySlug,
  Pathway
>;

// ---------------------------------------------------------------------------
// Category tabs (update §7–8). Each tab is a set of subcategory slugs.
// ---------------------------------------------------------------------------
export type CategoryTab = { slug: string; label: string; subcategories: string[] };

export const CATEGORY_TABS: Record<string, CategoryTab[]> = {
  "content-media": [
    {
      slug: "review",
      label: "Review & Earn",
      subcategories: [
        "video-reviewing",
        "ad-evaluation",
        "trailer-feedback",
        "article-evaluation",
        "book-reviewing",
        "music-reviewing",
        "digital-content-evaluation",
        "product-concept-feedback",
        "design-feedback",
        "consumer-feedback",
      ],
    },
    {
      slug: "blogging",
      label: "Blogging",
      subcategories: ["blogging", "sponsored-articles", "content-writing", "sponsored-newsletters"],
    },
    { slug: "vlogging", label: "Vlogging", subcategories: ["vlogging", "sponsored-videos"] },
    {
      slug: "ugc",
      label: "UGC",
      subcategories: ["user-generated-content", "product-demonstrations", "product-unboxing"],
    },
    {
      slug: "affiliate",
      label: "Affiliate",
      subcategories: ["affiliate-marketing", "influencer-collaborations", "brand-ambassador"],
    },
  ],
  "mystery-shopping": [
    { slug: "retail", label: "Retail", subcategories: ["in-store"] },
    { slug: "dining", label: "Dining", subcategories: ["dining", "coffee-shops", "drive-through"] },
    {
      slug: "hospitality",
      label: "Hospitality",
      subcategories: ["hotels-hospitality", "entertainment-venues"],
    },
    { slug: "automotive", label: "Automotive", subcategories: ["automotive"] },
    { slug: "telephone", label: "Telephone", subcategories: ["phone-online", "customer-service"] },
    { slug: "online", label: "Online", subcategories: ["online-shopping", "ecommerce"] },
    {
      slug: "audits",
      label: "Audits",
      subcategories: [
        "retail-audits",
        "display-photography",
        "inventory-verification",
        "pricing-verification",
      ],
    },
  ],
};

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
