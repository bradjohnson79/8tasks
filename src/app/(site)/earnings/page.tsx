import type { Metadata } from "next";
import { ChartNoAxesColumn } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";

export const metadata: Metadata = { title: "Earnings" };

const PLANNED = [
  "Self-reported earnings this month",
  "Missions you've recorded",
  "Saved opportunities",
  "Personal earnings goal",
];

export default function EarningsPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Earnings</h1>
      <p className="rounded-2xl border bg-surface p-4 text-sm text-text-2">
        8Tasks never holds or pays out money. Providers pay you directly. This page will let you{" "}
        <strong className="text-foreground">record</strong> what you earn so you can track progress.
        Every figure will be labelled as self-reported.
      </p>
      <EmptyState
        icon={ChartNoAxesColumn}
        title="Earnings tracker coming soon"
        description={`Planned: ${PLANNED.join(", ").toLowerCase()}. It needs an account, which isn't available yet.`}
      />
    </Container>
  );
}
