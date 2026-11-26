/**
 * Default discovery groups. These seed the admin-managed `discovery_groups` table
 * (drizzle/0005_discovery_rls.sql) and are the fallback if that table is empty or
 * unreachable, so the site always renders. Edit live values in /admin/discovery.
 * Pure data (icons are lucide names) so it can be used by scripts and tests.
 */

export type GroupKind = "pathway" | "category_tab" | "subsection";

export type DiscoveryGroup = {
  kind: GroupKind;
  slug: string;
  /** Category tabs only. */
  categorySlug?: string;
  title: string;
  description?: string;
  icon?: string;
  accent?: string;
  includes: string[];
  subcategorySlugs: string[];
  categorySlugs: string[];
  sortOrder: number;
};

type Def = Omit<DiscoveryGroup, "kind" | "sortOrder" | "includes" | "categorySlugs"> &
  Partial<Pick<DiscoveryGroup, "includes" | "categorySlugs">>;

const build = (kind: GroupKind, defs: Def[]): DiscoveryGroup[] =>
  defs.map((d, i) => ({
    kind,
    includes: [],
    categorySlugs: [],
    ...d,
    sortOrder: i + 1,
  }));

// ---------------------------------------------------------------------------
// Pathways: cross-category ways to earn (update §4). Not categories.
// ---------------------------------------------------------------------------
export const DEFAULT_PATHWAYS = build("pathway", [
  {
    slug: "quick-earnings",
    title: "Quick Earnings",
    description: "Small, simple tasks.",
    icon: "zap",
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
    categorySlugs: ["surveys"],
    subcategorySlugs: [
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
    icon: "map-pin",
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
    subcategorySlugs: [
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
    icon: "clapperboard",
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
    subcategorySlugs: [
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
    icon: "repeat",
    accent: "#53E6A0",
    includes: [
      "Affiliate blogging and vlogging",
      "Publisher networks",
      "Performance-based promotion",
      "Brand ambassador programs",
      "Recurring affiliate commissions",
    ],
    subcategorySlugs: ["affiliate-marketing", "brand-ambassador"],
  },
]);

// ---------------------------------------------------------------------------
// Category tabs (update §7–8 + master prompt §3.3). Categories without curated
// tabs show one tab per subcategory automatically.
// ---------------------------------------------------------------------------
const REVIEW_SUBCATEGORIES = [
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
  "written-reviews",
  "software-reviews",
  "video-testimonials",
];

export const DEFAULT_CATEGORY_TABS: DiscoveryGroup[] = [
  ...build("category_tab", [
    { slug: "review", title: "Review & Earn", subcategorySlugs: REVIEW_SUBCATEGORIES },
    {
      slug: "blogging",
      title: "Blogging",
      subcategorySlugs: [
        "blogging",
        "sponsored-articles",
        "content-writing",
        "sponsored-newsletters",
        "product-descriptions-copywriting",
      ],
    },
    {
      slug: "vlogging",
      title: "Vlogging",
      subcategorySlugs: ["vlogging", "sponsored-videos", "voiceover-narration"],
    },
    {
      slug: "ugc",
      title: "UGC",
      subcategorySlugs: ["user-generated-content", "product-demonstrations", "product-unboxing"],
    },
    {
      slug: "affiliate",
      title: "Affiliate",
      subcategorySlugs: ["affiliate-marketing", "influencer-collaborations", "brand-ambassador"],
    },
    {
      slug: "brand-ambassador",
      title: "Brand Ambassador Opportunities",
      subcategorySlugs: ["brand-ambassador"],
    },
    {
      slug: "direct-brand-collaborations",
      title: "Direct Brand Collaborations",
      subcategorySlugs: ["direct-brand-collaborations"],
    },
    {
      slug: "product-testing",
      title: "Product Testing",
      subcategorySlugs: ["brand-product-testing"],
    },
    {
      slug: "sponsored-content",
      title: "Sponsored Content",
      subcategorySlugs: ["sponsored-articles", "sponsored-videos", "sponsored-newsletters"],
    },
  ]).map((g) => ({ ...g, categorySlug: "content-media" })),
  ...build("category_tab", [
    { slug: "retail", title: "Retail", subcategorySlugs: ["in-store"] },
    {
      slug: "dining",
      title: "Dining",
      subcategorySlugs: ["dining", "coffee-shops", "drive-through"],
    },
    {
      slug: "hospitality",
      title: "Hospitality",
      subcategorySlugs: ["hotels-hospitality", "entertainment-venues"],
    },
    { slug: "automotive", title: "Automotive", subcategorySlugs: ["automotive"] },
    {
      slug: "telephone",
      title: "Telephone",
      subcategorySlugs: ["phone-online", "customer-service"],
    },
    { slug: "online", title: "Online", subcategorySlugs: ["online-shopping", "ecommerce"] },
    {
      slug: "audits",
      title: "Audits",
      subcategorySlugs: [
        "retail-audits",
        "display-photography",
        "inventory-verification",
        "pricing-verification",
      ],
    },
  ]).map((g) => ({ ...g, categorySlug: "mystery-shopping" })),
];

// ---------------------------------------------------------------------------
// Creative subsections: /earn/[slug] landing pages (master prompt §3.2).
// ---------------------------------------------------------------------------
export const DEFAULT_SUBSECTIONS = build("subsection", [
  {
    slug: "capture-earn",
    title: "Capture & Earn",
    description: "Photograph products, storefronts, places and everyday scenes for companies.",
    icon: "camera",
    accent: "#F6BE78",
    includes: [
      "Smartphone photo assignments",
      "Storefront and shelf photos",
      "Product photography",
      "Stock photo licensing",
      "Property and vehicle photos",
      "Visual data collection",
    ],
    categorySlugs: ["photography"],
    subcategorySlugs: ["display-photography", "photo-video-collection", "product-photos"],
  },
  {
    slug: "write-earn",
    title: "Write & Earn",
    description: "Blog posts, articles, product descriptions and written reviews.",
    icon: "pen-line",
    accent: "#7DB8FF",
    includes: [
      "Blogging",
      "Article writing",
      "Website content",
      "Product descriptions and copywriting",
      "Sponsored editorial content",
      "Written reviews",
    ],
    subcategorySlugs: [
      "blogging",
      "sponsored-articles",
      "content-writing",
      "sponsored-newsletters",
      "product-descriptions-copywriting",
      "written-reviews",
    ],
  },
  {
    slug: "film-earn",
    title: "Film & Earn",
    description: "UGC videos, product demos, unboxings and video feedback.",
    icon: "video",
    accent: "#B5A0F5",
    includes: [
      "UGC video creation",
      "Product demonstrations",
      "Unboxing videos",
      "Sponsored video content",
      "Video feedback on apps and sites",
      "Genuine video testimonials",
    ],
    subcategorySlugs: [
      "vlogging",
      "sponsored-videos",
      "user-generated-content",
      "product-demonstrations",
      "product-unboxing",
      "video-testimonials",
      "video-feedback",
      "voiceover-narration",
    ],
  },
  {
    slug: "review-earn",
    title: "Review & Earn",
    description: "Honest feedback on products, media, software and services.",
    icon: "star",
    accent: "#68D8DB",
    includes: [
      "Honest product reviews",
      "Software reviews",
      "Private consumer feedback",
      "Book and music reviews",
      "Ad and trailer evaluations",
    ],
    subcategorySlugs: REVIEW_SUBCATEGORIES,
  },
  {
    slug: "promote-earn",
    title: "Promote & Earn",
    description: "Affiliate programs, brand ambassador roles and brand collaborations.",
    icon: "megaphone",
    accent: "#53E6A0",
    includes: [
      "Affiliate marketing",
      "Brand ambassador opportunities",
      "Direct brand collaborations",
      "Influencer collaborations",
    ],
    subcategorySlugs: [
      "affiliate-marketing",
      "brand-ambassador",
      "influencer-collaborations",
      "direct-brand-collaborations",
    ],
  },
]);

export const DEFAULT_GROUPS: DiscoveryGroup[] = [
  ...DEFAULT_PATHWAYS,
  ...DEFAULT_CATEGORY_TABS,
  ...DEFAULT_SUBSECTIONS,
];
