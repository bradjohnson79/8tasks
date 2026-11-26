import type { MetadataRoute } from "next";
import { getActiveCategories, getPublishedProviders } from "@/db/queries/public";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { loadOpportunities } from "@/lib/missions/source";
import { SITE_URL, STATIC_ROUTES } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/** Real, published pages only. Demo listings never appear. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;
  const out: MetadataRoute.Sitemap = STATIC_ROUTES.map((p) => ({ url: url(p) }));
  try {
    const [categories, providers, config, opportunities] = await Promise.all([
      getActiveCategories(),
      getPublishedProviders(),
      getDiscoveryConfig(),
      loadOpportunities(),
    ]);
    out.push(...categories.map((c) => ({ url: url(`/categories/${c.slug}`) })));
    out.push(...config.subsections.map((s) => ({ url: url(`/earn/${s.slug}`) })));
    out.push(
      ...providers.filter((p) => !p.isDemo).map((p) => ({ url: url(`/providers/${p.slug}`) })),
    );
    out.push(
      ...opportunities
        .filter((o) => !o.isDemo)
        .map((o) => ({ url: url(`/missions/${o.id}`), lastModified: o.lastVerifiedAt })),
    );
  } catch (err) {
    console.error("sitemap: database unavailable", err);
  }
  return out;
}
