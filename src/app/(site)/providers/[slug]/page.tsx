import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLinkIcon } from "lucide-react";
import { AffiliateNotice } from "@/components/site/affiliate-notice";
import { CountryBadges } from "@/components/site/country-badges";
import { OpportunityCard } from "@/components/site/opportunity-card";
import { ProviderLogo } from "@/components/site/provider-logo";
import { Badge } from "@/components/ui/badge";
import { getProviderProfile } from "@/db/queries/public";
import { COUNTRY_LABELS, isSupportedCountry } from "@/lib/markets";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProviderProfile((await params).slug);
  return data
    ? {
        title: data.provider.name,
        description: data.provider.summary ?? undefined,
      }
    : {};
}

export default async function ProviderPage({ params }: Props) {
  const data = await getProviderProfile((await params).slug);
  if (!data) notFound();
  const { provider, items } = data;
  const markets = provider.countries.filter(isSupportedCountry).map((c) => COUNTRY_LABELS[c]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <Link href="/providers" className="hover:text-foreground">
          Providers
        </Link>{" "}
        / <span className="text-foreground">{provider.name}</span>
      </nav>

      <header className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-start">
        <ProviderLogo name={provider.name} logoUrl={provider.logoUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">{provider.name}</h1>
            {provider.isDemo && <Badge variant="warning">Demo</Badge>}
            <CountryBadges countries={provider.countries} />
          </div>
          {provider.summary && <p className="text-muted-foreground">{provider.summary}</p>}
          <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Accepts members in</dt>
              <dd className="font-medium">{markets.join(" and ") || "Not stated"}</dd>
            </div>
            {provider.websiteUrl && (
              <div>
                <dt className="text-muted-foreground">Official website</dt>
                <dd className="font-medium">
                  <a
                    href={provider.websiteUrl}
                    rel="nofollow noopener noreferrer"
                    target="_blank"
                    className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
                  >
                    {new URL(provider.websiteUrl).hostname.replace(/^www\./, "")}
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </header>

      {provider.description && (
        <section className="mt-8 max-w-3xl space-y-3">
          <h2 className="text-xl font-semibold">About {provider.name}</h2>
          <p className="whitespace-pre-line text-muted-foreground">{provider.description}</p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Opportunities</h2>
        {items.length > 0 ? (
          <>
            <AffiliateNotice className="mb-6" />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((o) => (
                <li key={o.id}>
                  <OpportunityCard {...o} />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            No opportunities listed for this provider yet.
          </p>
        )}
      </section>
    </div>
  );
}
