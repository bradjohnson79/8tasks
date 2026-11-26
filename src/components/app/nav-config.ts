import type { LucideIcon } from "lucide-react";
import { Bookmark, ChartNoAxesColumn, Compass, Sparkles, User } from "lucide-react";

/** The five destinations (design spec §18), shared by mobile bottom nav and desktop header. */
export const APP_DESTINATIONS: {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (p: string) => boolean;
}[] = [
  {
    href: "/",
    label: "Discover",
    icon: Compass,
    match: (p) =>
      p === "/" ||
      p.startsWith("/missions") ||
      p.startsWith("/categories") ||
      p.startsWith("/providers"),
  },
  { href: "/daily-8", label: "Daily 8", icon: Sparkles, match: (p) => p.startsWith("/daily-8") },
  { href: "/saved", label: "Saved", icon: Bookmark, match: (p) => p.startsWith("/saved") },
  {
    href: "/earnings",
    label: "Earnings",
    icon: ChartNoAxesColumn,
    match: (p) => p.startsWith("/earnings"),
  },
  { href: "/profile", label: "Profile", icon: User, match: (p) => p.startsWith("/profile") },
];
