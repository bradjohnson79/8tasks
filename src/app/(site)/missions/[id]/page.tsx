import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShoppingCart, TriangleAlert } from "lucide-react";
import { AffiliateDisclosure } from "@/components/app/affiliate-disclosure";
import { BookmarkButton } from "@/components/app/bookmark-button";
import { CompensationDisplay } from "@/components/app/compensation-display";
import { Container } from "@/components/app/container";
import { MissionMetadata } from "@/components/app/mission-metadata";
import { StatusPill } from "@/components/app/status-pill";
import { formatCompensation } from "@/lib/missions/compensation";
import { pathwaysFor } from "@/lib/missions/filters";
import { allMetadata } from "@/lib/missions/metadata";
import { loadOpportunity } from "@/lib/missions/source";
import type { Opportunity } from "@/lib/missions/types";
import { categoryDisplay, PATHWAY_BY_SLUG } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^(demo-[a-z0-9-]{1,60}|[0-9a-f-]{36})$/.test(id)) return undefined;
  return loadOpportunity(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const o = await load((await params).id);
  return o ? { title: o.title, description: o.summary } : {};
}

/** Cash pay, reimbursement and upfront spending shown as separate lines (design update §10). */
function PaymentBreakdown({ o }: { o: Opportunity }) {
  const c = o.compensation;
  const rows: { label: string; value: string }[] = [];
  if (c.type === "payment_plus_reimbursement") {
    rows.push({ label: "Cash payment", value: `$${c.amount} ${c.currency}` });
    rows.push({
      label: `${c.item} reimbursement`,
      value: c.maxReimbursement ? `Up to $${c.maxReimbursement} ${c.currency}` : "Reimbursed",
    });
  } else if (c.type === "reimbursement_only") {
    rows.push({ label: "Cash payment", value: "None" });
    rows.push({
      label: `${c.item} reimbursement`,
      value: c.maxReimbursement
        ? `Up to $${c.maxReimbursement}${c.currency ? ` ${c.currency}` : ""}`
        : "Reimbursed",
    });
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.length > 0 && (
        <dl className="divide-y rounded-xl border bg-background/40">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <dt className="text-text-2">{r.label}</dt>
              <dd className="font-semibold tabular-nums">{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {o.attributes.purchaseRequired && (
        <p className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-sm text-warning">
          <ShoppingCart className="mt-0.5 size-4 shrink-0" aria-hidden />
          You must make a purchase upfront. Reimbursement repays your costs after approval and is
          not earnings.
        </p>
      )}
      {(c.type === "commission" || c.type === "hybrid") && (
        <p className="flex items-start gap-2 rounded-xl bg-elevated p-3 text-sm text-text-2">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          Commission is performance-based. Income depends on results and ongoing effort and is never
          guaranteed.
        </p>
      )}
    </div>
  );
}

function ListSection({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="list-disc space-y-1 pl-5 text-[15px] text-text-2 marker:text-emerald">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </section>
  );
}

export default async function MissionDetailPage({ params }: Props) {
  const o = await load((await params).id);
  if (!o) notFound();
  const d = categoryDisplay(o.categorySlug);
  const Icon = d.icon;
  const pay = formatCompensation(o.compensation);
  const canContinue = !o.isDemo && o.hasOutboundLink;

  return (
    <Container className="max-w-3xl pt-4 pb-28 sm:pt-6 lg:pb-8">
      <Link
        href="/missions"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-text-2 hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to missions
      </Link>

      <article className="mt-2 flex flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border bg-surface p-5">
          <div className="flex items-start gap-3">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-xl bg-elevated"
              style={{ color: d.accent }}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-2">
                {o.providerSlug ? (
                  <Link
                    href={`/providers/${o.providerSlug}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {o.providerName}
                  </Link>
                ) : (
                  o.providerName
                )}{" "}
                · {o.categoryName}
              </p>
              <h1 className="mt-1 text-2xl leading-tight font-bold tracking-tight sm:text-[28px]">
                {o.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusPill>
                  {o.kind === "provider" ? "Provider opportunity" : "Specific mission"}
                </StatusPill>
                {o.isDemo && (
                  <StatusPill tone="warning">Demo example — not a real offer</StatusPill>
                )}
                {o.isSponsored && <StatusPill tone="info">Sponsored</StatusPill>}
                {pathwaysFor(o).map((p) => (
                  <StatusPill key={p}>{PATHWAY_BY_SLUG[p].title}</StatusPill>
                ))}
              </div>
            </div>
            <BookmarkButton id={o.id} title={o.title} />
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-text-2 uppercase">Compensation</p>
              <CompensationDisplay
                compensation={o.compensation}
                size="detail"
                className="text-left"
              />
            </div>
            <MissionMetadata items={allMetadata(o)} className="sm:max-w-[60%] sm:justify-end" />
          </div>
          <PaymentBreakdown o={o} />
        </header>

        {(o.summary || o.description) && (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              About this {o.kind === "provider" ? "opportunity" : "mission"}
            </h2>
            {o.summary && <p className="text-[15px] text-text-2">{o.summary}</p>}
            {o.description && <p className="text-[15px] text-text-2">{o.description}</p>}
          </section>
        )}
        <ListSection title="What you'll do" items={o.whatYouWillDo} />
        <ListSection title="Eligibility" items={o.eligibility} />

        {o.creatorRequirements?.length ? (
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Creator requirements</h2>
            <p className="text-sm text-text-2">
              Not everyone qualifies. The provider decides who is accepted.
            </p>
            <dl className="divide-y rounded-xl border bg-surface">
              {o.creatorRequirements.map((r) => (
                <div
                  key={r.label}
                  className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:justify-between sm:gap-6"
                >
                  <dt className="text-sm text-text-2">{r.label}</dt>
                  <dd className="text-sm font-medium sm:text-right">{r.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        <ListSection
          title="Payment information"
          items={
            o.paymentDetails ??
            (o.compensation.type === "unknown"
              ? ["Payment terms are set by the provider. Check their site before you start."]
              : undefined)
          }
        />
        <ListSection title="Provider terms and restrictions" items={o.terms} />

        <p className="rounded-xl border bg-surface p-4 text-sm text-text-2">
          This {o.kind === "provider" ? "opportunity" : "mission"} is offered by {o.providerName},
          not 8Tasks. You&apos;ll leave 8Tasks to sign up and complete it on the provider&apos;s
          site, under their terms. {pay.label}.
        </p>
        <AffiliateDisclosure />
      </article>

      {/* Primary action: sticky above the bottom nav on mobile, inline on desktop (design spec §17) */}
      <div
        className="fixed inset-x-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur lg:static lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0"
        style={{ bottom: "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto max-w-3xl">
          {canContinue ? (
            <a
              href={`/go/${o.id}`}
              rel="sponsored nofollow noopener"
              target="_blank"
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-action text-[15px] font-semibold text-action-foreground hover:bg-action/80"
            >
              Continue to Provider <ExternalLink className="size-4" aria-hidden />
              <span className="sr-only">(opens {o.providerName} in a new tab)</span>
            </a>
          ) : (
            <span
              aria-disabled="true"
              className="flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-elevated text-[15px] font-semibold text-text-2"
            >
              {o.isDemo ? "Demo listing: no provider link" : "Provider link coming soon"}
            </span>
          )}
        </div>
      </div>
    </Container>
  );
}
