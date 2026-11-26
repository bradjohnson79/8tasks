/**
 * Seed content.
 *
 * CATEGORY_SEED: the founder's 8 mission categories (design spec, 2026-11-26).
 *
 * DEMO_PROVIDERS: fictional placeholders for building the UI. Every row is written
 * with is_demo = true, uses reserved example.com/.test URLs, and states it is a demo.
 * They contain NO payouts, earnings, ratings or endorsements (CLAUDE.md rule 1).
 */

/**
 * Categories that were merged into another one. The seed moves their subcategories and
 * opportunities to the target, then removes the old category.
 * 2026-11-26: Micro Tasks merged into AI Training & Data Tasks.
 * 2026-11-26 (design spec): category set replaced by the founder's 8. Old -> new:
 *   Photo Scouting -> Photography, AI Training & Data Tasks -> Microtasks & AI,
 *   Product Testing -> Paid Research, Transcription & Translation -> Microtasks & AI.
 */
export const RETIRED_CATEGORIES: Record<string, string> = {
  "micro-tasks": "microtasks-ai",
  "ai-data-tasks": "microtasks-ai",
  "photo-scouting": "photography",
  "product-testing": "paid-research",
  "transcription-translation": "microtasks-ai",
};

/** Subcategories that moved to a different category (idempotent). */
export const MOVED_SUBCATEGORIES: { slug: string; from: string; to: string }[] = [
  { slug: "game-testing", from: "app-website-testing", to: "gaming-entertainment" },
];

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  subcategories: { slug: string; name: string }[];
};

/**
 * The founder's 8 core categories (design spec §12, update §6–8). Admin-configurable afterwards.
 * Display details (short labels, accent colours, tab groups) live in src/lib/taxonomy.ts.
 */
export const CATEGORY_SEED: CategorySeed[] = [
  {
    slug: "surveys",
    name: "Surveys",
    description: "Share your opinions on products, brands and everyday topics.",
    icon: "clipboard-list",
    sortOrder: 1,
    subcategories: [
      { slug: "online-surveys", name: "Online surveys" },
      { slug: "polls", name: "Quick polls" },
      { slug: "receipt-scanning", name: "Receipt scanning" },
    ],
  },
  {
    slug: "app-website-testing",
    name: "App & Website Testing",
    description: "Try new apps and websites and report what works and what doesn't.",
    icon: "smartphone",
    sortOrder: 2,
    subcategories: [
      { slug: "usability-testing", name: "Usability testing" },
      { slug: "bug-testing", name: "Bug testing" },
    ],
  },
  {
    slug: "photography",
    name: "Photography",
    description: "Photograph storefronts, store shelves, products and places for companies.",
    icon: "camera",
    sortOrder: 3,
    subcategories: [
      { slug: "storefronts-locations", name: "Storefronts & locations" },
      { slug: "shelf-checks", name: "Store shelf checks" },
      { slug: "product-photos", name: "Product photos" },
    ],
  },
  {
    slug: "mystery-shopping",
    name: "Mystery Shopping",
    description: "Visit stores, restaurants and services, or evaluate them by phone or online.",
    icon: "shopping-bag",
    sortOrder: 4,
    subcategories: [
      { slug: "in-store", name: "Retail shopping" },
      { slug: "dining", name: "Restaurants & dining" },
      { slug: "coffee-shops", name: "Coffee shops" },
      { slug: "drive-through", name: "Drive-through evaluations" },
      { slug: "hotels-hospitality", name: "Hotels & hospitality" },
      { slug: "automotive", name: "Automotive dealerships" },
      { slug: "phone-online", name: "Telephone evaluations" },
      { slug: "online-shopping", name: "Online mystery shopping" },
      { slug: "ecommerce", name: "E-commerce evaluations" },
      { slug: "retail-audits", name: "Retail audits" },
      { slug: "entertainment-venues", name: "Entertainment venues" },
      { slug: "customer-service", name: "Customer service evaluations" },
      { slug: "display-photography", name: "Product display photography" },
      { slug: "inventory-verification", name: "Inventory verification" },
      { slug: "pricing-verification", name: "Pricing verification" },
    ],
  },
  {
    slug: "content-media",
    name: "Content & Media",
    description: "Review videos, ads and articles, or create blogs, videos and UGC for brands.",
    icon: "clapperboard",
    sortOrder: 5,
    subcategories: [
      // Review & Earn
      { slug: "video-reviewing", name: "Video reviewing" },
      { slug: "ad-evaluation", name: "Commercial & advertisement evaluation" },
      { slug: "trailer-feedback", name: "Movie trailer feedback" },
      { slug: "article-evaluation", name: "Article reviewing" },
      { slug: "book-reviewing", name: "Book reviewing" },
      { slug: "music-reviewing", name: "Music reviewing" },
      { slug: "digital-content-evaluation", name: "Digital content evaluation" },
      { slug: "product-concept-feedback", name: "Product concept feedback" },
      { slug: "design-feedback", name: "Creative design evaluation" },
      { slug: "consumer-feedback", name: "Private consumer feedback" },
      // Create & Earn
      { slug: "blogging", name: "Blogging" },
      { slug: "vlogging", name: "Vlogging" },
      { slug: "sponsored-articles", name: "Sponsored articles" },
      { slug: "content-writing", name: "Content writing" },
      { slug: "sponsored-videos", name: "Sponsored videos" },
      { slug: "user-generated-content", name: "User-generated content" },
      { slug: "product-demonstrations", name: "Product demonstrations" },
      { slug: "product-unboxing", name: "Product unboxing" },
      { slug: "affiliate-marketing", name: "Affiliate marketing" },
      { slug: "influencer-collaborations", name: "Influencer collaborations" },
      { slug: "brand-ambassador", name: "Brand ambassador opportunities" },
      { slug: "sponsored-newsletters", name: "Sponsored newsletters" },
    ],
  },
  {
    slug: "gaming-entertainment",
    name: "Gaming & Entertainment",
    description: "Play-test games and give feedback on entertainment experiences.",
    icon: "gamepad-2",
    sortOrder: 6,
    subcategories: [
      { slug: "game-testing", name: "Game testing" },
      { slug: "entertainment-feedback", name: "Entertainment feedback" },
    ],
  },
  {
    slug: "paid-research",
    name: "Paid Research",
    description: "Join interviews, focus groups, studies and at-home product tests.",
    icon: "messages-square",
    sortOrder: 7,
    subcategories: [
      { slug: "focus-groups", name: "Focus groups" },
      { slug: "interviews", name: "1:1 interviews" },
      { slug: "academic-studies", name: "Academic studies" },
      { slug: "home-testing", name: "At-home product testing" },
      { slug: "taste-tests", name: "Taste tests" },
    ],
  },
  {
    slug: "microtasks-ai",
    name: "Microtasks & AI",
    description: "Short online tasks: AI evaluation, fact-checking, labelling, transcription and more.",
    icon: "brain-circuit",
    sortOrder: 8,
    subcategories: [
      { slug: "ai-evaluation", name: "AI response evaluation" },
      { slug: "fact-checking", name: "Factual accuracy checking" },
      { slug: "data-labelling", name: "Data labelling" },
      { slug: "categorisation", name: "Data categorization" },
      { slug: "search-evaluation", name: "Search result evaluation" },
      { slug: "ai-training", name: "AI training tasks" },
      { slug: "content-moderation", name: "Content review" },
      { slug: "transcription", name: "Transcription" },
      { slug: "translation", name: "Translation" },
      { slug: "captioning", name: "Captioning" },
    ],
  },
];

type DemoProvider = {
  provider: {
    slug: string;
    name: string;
    websiteUrl: string;
    summary: string;
    description: string;
    countries: string[];
  };
  linkUrl: string;
  opportunities: {
    slug: string;
    title: string;
    category: string;
    summary: string;
  }[];
};

const DEMO_NOTE = "Demo placeholder for development. Not a real provider.";

export const DEMO_PROVIDERS: DemoProvider[] = [
  {
    provider: {
      slug: "demo-survey-panel",
      name: "Demo Survey Panel",
      websiteUrl: "https://survey-panel.example.com",
      summary: DEMO_NOTE,
      description: `${DEMO_NOTE} Used to preview how a survey provider profile looks.`,
      countries: ["US", "CA"],
    },
    linkUrl: "https://survey-panel.example.com/join?demo=1",
    opportunities: [
      {
        slug: "member-surveys",
        title: "Demo: member surveys",
        category: "surveys",
        summary: "Placeholder listing showing a provider-level survey opportunity.",
      },
    ],
  },
  {
    provider: {
      slug: "demo-usability-lab",
      name: "Demo Usability Lab",
      websiteUrl: "https://usability-lab.example.com",
      summary: DEMO_NOTE,
      description: `${DEMO_NOTE} Used to preview a testing provider profile.`,
      countries: ["US"],
    },
    linkUrl: "https://usability-lab.example.com/testers?demo=1",
    opportunities: [
      {
        slug: "website-tests",
        title: "Demo: website usability tests",
        category: "app-website-testing",
        summary: "Placeholder listing showing a provider-level testing opportunity.",
      },
    ],
  },
  {
    provider: {
      slug: "demo-research-studies",
      name: "Demo Research Studies",
      websiteUrl: "https://research-studies.example.com",
      summary: DEMO_NOTE,
      description: `${DEMO_NOTE} Used to preview a paid-research provider profile.`,
      countries: ["CA"],
    },
    linkUrl: "https://research-studies.example.com/signup?demo=1",
    opportunities: [
      {
        slug: "focus-groups",
        title: "Demo: focus groups",
        category: "paid-research",
        summary: "Placeholder listing showing a provider-level research opportunity.",
      },
    ],
  },
];
