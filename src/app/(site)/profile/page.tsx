import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Profile</h1>
      <EmptyState
        icon={UserRound}
        title="Accounts are coming soon"
        description="You can browse, search and save missions on this device without signing in. Sign-up for personalized Daily 8 picks and earnings tracking will open later."
      />
    </Container>
  );
}
