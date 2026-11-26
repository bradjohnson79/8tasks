import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  ClipboardCheck,
  Clock,
  FileText,
  Globe,
  House,
  Laptop,
  MapPin,
  Receipt,
  ShoppingCart,
  Smartphone,
  Users,
  UserCheck,
  Briefcase,
  CalendarClock,
} from "lucide-react";
import type { MetaItem, MetaKey } from "@/lib/missions/metadata";
import { cn } from "@/lib/utils";

const ICONS: Record<MetaKey, LucideIcon> = {
  duration: Clock,
  remote: House,
  "in-person": MapPin,
  location: MapPin,
  purchase: ShoppingCart,
  "no-purchase": BadgeCheck,
  reimbursed: Receipt,
  audience: Users,
  "no-audience": UserCheck,
  portfolio: Briefcase,
  beginner: BadgeCheck,
  application: FileText,
  assessment: ClipboardCheck,
  smartphone: Smartphone,
  computer: Laptop,
  country: Globe,
  availability: CalendarClock,
};

/** Small icon + text facts. Purchase disclosures are tinted so they aren't missed. */
export function MissionMetadata({ items, className }: { items: MetaItem[]; className?: string }) {
  if (!items.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-text-2", className)}>
      {items.map((m) => {
        const Icon = ICONS[m.key];
        return (
          <li
            key={m.key}
            className={cn("flex items-center gap-1.5", m.key === "purchase" && "text-warning")}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {m.label}
          </li>
        );
      })}
    </ul>
  );
}
