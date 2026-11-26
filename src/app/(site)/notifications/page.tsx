import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { Container } from "@/components/app/container";
import { EmptyState } from "@/components/app/empty-state";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Notifications</h1>
      <EmptyState
        icon={Bell}
        title="No notifications yet"
        description="New mission alerts will appear here once accounts are available."
      />
    </Container>
  );
}
