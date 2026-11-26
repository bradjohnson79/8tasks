import type { Metadata } from "next";
import Link from "next/link";
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
        description="In-app notifications need accounts, which aren't available yet. Free email alerts are available now."
      >
        <Link
          href="/daily-8#signup"
          className="flex h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground"
        >
          Get free alerts
        </Link>
      </EmptyState>
    </Container>
  );
}
