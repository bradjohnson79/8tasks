import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { requireUser } from "@/lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Promote 8Tasks", robots: { index: false } };

/** Promotional partner program: Phase 3 (needs founder approval and verified attribution). */
export default async function PromotePage() {
  await requireUser("/profile/promote");
  return (
    <Container className="flex max-w-2xl flex-col gap-4 pt-5 pb-10 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Promote 8Tasks</h1>
      <p className="text-text-2">
        A free promotional partner program for creators, bloggers and newsletter writers is planned.
        Approved partners will get referral links and ready-made materials. Joining will always be
        free, and earnings are never guaranteed.
      </p>
      <p className="text-sm text-text-2">Applications aren&apos;t open yet.</p>
    </Container>
  );
}
