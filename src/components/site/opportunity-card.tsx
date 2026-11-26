import { ExternalLinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountryBadges } from "./country-badges";
import Link from "next/link";

type Props = {
  id: string;
  title: string;
  summary: string | null;
  countries: string[];
  isSponsored: boolean;
  isDemo: boolean;
  hasLink: boolean;
  providerName: string;
  providerSlug: string;
};

export function OpportunityCard(o: Props) {
  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {o.isSponsored && <Badge variant="secondary">Sponsored</Badge>}
        {o.isDemo && <Badge variant="warning">Demo</Badge>}
        <CountryBadges countries={o.countries} />
      </div>
      <div className="flex-1 space-y-1.5">
        <h3 className="font-semibold leading-snug">{o.title}</h3>
        <p className="text-sm text-muted-foreground">
          by{" "}
          <Link
            href={`/providers/${o.providerSlug}`}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {o.providerName}
          </Link>
        </p>
        {o.summary && <p className="text-sm text-muted-foreground">{o.summary}</p>}
      </div>
      {o.hasLink && (
        <Button asChild className="w-full sm:w-auto">
          <a href={`/go/${o.id}`} rel="sponsored nofollow noopener" target="_blank">
            Visit provider <ExternalLinkIcon />
          </a>
        </Button>
      )}
    </article>
  );
}
