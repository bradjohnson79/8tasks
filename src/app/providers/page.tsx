import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { getPublishedProviders } from "@/db/queries/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Providers" };

export default async function ProvidersPage() {
  const providers = await getPublishedProviders();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight">Providers</h1>
      <p className="mt-1 mb-8 text-muted-foreground">
        Companies whose earning opportunities are listed on 8Tasks.
      </p>
      {providers.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap gap-2">
                {p.isDemo && <Badge variant="warning">Demo</Badge>}
                {p.countries.length > 0 && (
                  <Badge variant="outline">{p.countries.join(" · ")}</Badge>
                )}
              </div>
              <h2 className="font-semibold">{p.name}</h2>
              {p.summary && (
                <p className="text-sm text-muted-foreground">{p.summary}</p>
              )}
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
