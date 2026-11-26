import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/account";
import { Container } from "@/components/app/container";
import { MissionCard } from "@/components/app/mission-card";
import { loadOpportunities } from "@/lib/missions/source";
import { SavedList } from "./saved-list";
import { SavedSearches } from "./saved-searches";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const [all, user] = await Promise.all([loadOpportunities(), getUser().catch(() => null)]);
  return (
    <Container className="flex flex-col gap-5 pt-5 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Saved</h1>
        {user ? (
          <p className="text-sm text-text-2">Synced to your free account on every device.</p>
        ) : (
          <p className="text-sm text-text-2">
            Saved on this device, free.{" "}
            <Link
              href="/profile/sign-in?next=/saved"
              className="font-medium text-emerald hover:underline"
            >
              Create a free account
            </Link>{" "}
            to keep them on every device (optional).
          </p>
        )}
      </div>
      <SavedSearches />
      <h2 className="text-lg font-semibold">Saved opportunities</h2>
      <SavedList
        cards={all.map((o) => ({
          id: o.id,
          node: <MissionCard opportunity={o} headingLevel={2} />,
        }))}
      />
    </Container>
  );
}
