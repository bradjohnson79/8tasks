import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";

export const metadata: Metadata = { title: "My Daily 8" };

export default function Daily8Page() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">My Daily 8</h1>
      <div className="rounded-2xl border border-emerald/15 bg-daily8 p-5">
        <p className="font-semibold">Discover opportunities matched to you.</p>
        <p className="mt-1 text-sm text-text-2">
          Your Daily 8 will suggest up to eight opportunities each day based on your interests,
          location and the devices you have. We&apos;ll only show what genuinely fits, even if
          that&apos;s fewer than eight.
        </p>
      </div>
      <EmptyState
        icon={Sparkles}
        title="No personalized recommendations yet"
        description="Personalization needs an 8Tasks account, which isn't available yet. Until then, explore by category or by how you want to earn."
      >
        <Link
          href="/"
          className="flex h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground"
        >
          Explore missions
        </Link>
      </EmptyState>
    </Container>
  );
}
