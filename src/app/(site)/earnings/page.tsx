import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChartNoAxesColumn } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";
import { getUser } from "@/lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Earnings" };

/** Bottom-nav "Earnings": signed-in users get their personal log; guests an invitation. */
export default async function EarningsPage() {
  if (await getUser().catch(() => null)) redirect("/profile/earnings");
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Earnings</h1>
      <p className="rounded-2xl border bg-surface p-4 text-sm text-text-2">
        8Tasks never holds or pays out money. Providers pay you directly. With a free account you
        can <strong className="text-foreground">record</strong> what you earn to track your
        progress. Every figure is self-reported and private to you.
      </p>
      <EmptyState
        icon={ChartNoAxesColumn}
        title="Track your earnings for free"
        description="Log payments, expenses and reimbursements from any provider, and download them as CSV."
      >
        <Link
          href="/profile/sign-in?next=/profile/earnings"
          className="text-sm font-semibold text-emerald hover:underline"
        >
          Create a free account
        </Link>
      </EmptyState>
    </Container>
  );
}
