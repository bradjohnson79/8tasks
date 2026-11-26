import Link from "next/link";
import { Bell, User } from "lucide-react";
import { BrandWordmark } from "./brand-wordmark";
import { DesktopNav } from "./desktop-nav";

const iconButton =
  "grid size-11 place-items-center rounded-xl text-text-2 transition-colors hover:bg-surface hover:text-foreground";

/** Compact sticky application header, 64px (design spec §9). */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <BrandWordmark />
        <DesktopNav />
        <div className="flex items-center gap-1">
          <Link href="/notifications" className={iconButton} aria-label="Notifications">
            <Bell className="size-5" aria-hidden />
          </Link>
          <Link href="/profile" className={iconButton} aria-label="Profile and sign in">
            <User className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
