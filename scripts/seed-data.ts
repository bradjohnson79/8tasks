/**
 * Seed content.
 *
 * CATEGORY_SEED: the proposed 8 mission categories. Admin-configurable later.
 * Pending founder confirmation against docs/PROJECT_BLUEPRINT.md.
 *
 * DEMO_PROVIDERS: fictional placeholders for building the UI. Every row is written
 * with is_demo = true, uses reserved example.com/.test URLs, and states it is a demo.
 * They contain NO payouts, earnings, ratings or endorsements (CLAUDE.md rule 1).
 */

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  subcategories: { slug: string; name: string }[];
};

export const CATEGORY_SEED: CategorySeed[] = [
  {
    slug: "surveys",
    name: "Surveys & Polls",
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
    description:
      "Try new apps and websites and report what works and what doesn't.",
    icon: "monitor-smartphone",
    sortOrder: 2,
    subcategories: [
      { slug: "usability-testing", name: "Usability testing" },
      { slug: "bug-testing", name: "Bug testing" },
      { slug: "game-testing", name: "Game testing" },
    ],
  },
  {
    slug: "paid-research",
    name: "Paid Research & Focus Groups",
    description: "Take part in interviews, focus groups and academic studies.",
    icon: "users",
    sortOrder: 3,
    subcategories: [
      { slug: "focus-groups", name: "Focus groups" },
      { slug: "interviews", name: "1:1 interviews" },
      { slug: "academic-studies", name: "Academic studies" },
    ],
  },
  {
    slug: "mystery-shopping",
    name: "Mystery Shopping",
    description:
      "Visit stores, restaurants or services and report on the experience.",
    icon: "shopping-bag",
    sortOrder: 4,
    subcategories: [
      { slug: "in-store", name: "In-store visits" },
      { slug: "dining", name: "Restaurants & dining" },
      { slug: "phone-online", name: "Phone & online audits" },
    ],
  },
  {
    slug: "product-testing",
    name: "Product Testing",
    description: "Try products at home and share honest feedback.",
    icon: "package-open",
    sortOrder: 5,
    subcategories: [
      { slug: "home-testing", name: "At-home testing" },
      { slug: "taste-tests", name: "Taste tests" },
    ],
  },
  {
    slug: "ai-data-tasks",
    name: "AI Training & Data Tasks",
    description:
      "Help improve AI systems by rating, labelling and writing examples.",
    icon: "sparkles",
    sortOrder: 6,
    subcategories: [
      { slug: "data-labelling", name: "Data labelling" },
      { slug: "ai-evaluation", name: "AI response evaluation" },
      { slug: "search-evaluation", name: "Search evaluation" },
    ],
  },
  {
    slug: "micro-tasks",
    name: "Micro Tasks",
    description: "Short online tasks you can fit into spare minutes.",
    icon: "list-checks",
    sortOrder: 7,
    subcategories: [
      { slug: "categorisation", name: "Categorisation" },
      { slug: "content-moderation", name: "Content review" },
    ],
  },
  {
    slug: "transcription-translation",
    name: "Transcription & Translation",
    description: "Turn audio into text or work across languages.",
    icon: "languages",
    sortOrder: 8,
    subcategories: [
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
        summary:
          "Placeholder listing showing a provider-level survey opportunity.",
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
        summary:
          "Placeholder listing showing a provider-level testing opportunity.",
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
        summary:
          "Placeholder listing showing a provider-level research opportunity.",
      },
    ],
  },
];
