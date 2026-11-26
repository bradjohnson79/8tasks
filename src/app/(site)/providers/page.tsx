import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { CountryBadges } from "@/components/app/country-badges";
import { ProviderLogo } from "@/components/app/provider-logo";
import { Badge } from "@/components/ui/badge";
import { getPublishedProviders } from "@/db/queries/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  alternates: { canonical: "/providers" },
  title: "Providers",
  description: "Companies in Canada and the US whose earning opportunities are listed on 8Tasks.",
};

export default async function ProvidersPage() {
  const providers = await getPublishedProviders();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        Companies whose earning opportunities are listed on 8Tasks. We currently list providers that
        accept members in Canada and the US.
      </p>
      {providers.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <li key={p.id}>
              <Link
                href={`/providers/${p.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="flex items-center gap-3">
                  <ProviderLogo name={p.name} logoUrl={p.logoUrl} />
                  <h2 className="font-semibold">{p.name}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.isDemo && <Badge variant="warning">Demo</Badge>}
                  <CountryBadges countries={p.countries} />
                </div>
                {p.summary && <p className="flex-1 text-sm text-muted-foreground">{p.summary}</p>}
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  View profile
                  <ArrowRightIcon
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
          Provider profiles are on the way.
        </p>
      )}
    </div>
  );
}
