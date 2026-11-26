import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { MissionCard } from "@/components/app/mission-card";
import { loadOpportunities } from "@/lib/missions/source";
import { SavedList } from "./saved-list";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Saved" };

export default async function SavedPage() {
  const all = await loadOpportunities();
  return (
    <Container className="flex flex-col gap-5 pt-5 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Saved</h1>
        <p className="text-sm text-text-2">
          Saved on this device. Accounts that sync across devices are coming later.
        </p>
      </div>
      <SavedList
        cards={all.map((o) => ({
          id: o.id,
          node: <MissionCard opportunity={o} headingLevel={2} />,
        }))}
      />
    </Container>
  );
}
