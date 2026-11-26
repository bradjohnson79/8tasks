import {
  ClipboardListIcon,
  LanguagesIcon,
  ListChecksIcon,
  type LucideIcon,
  MonitorSmartphoneIcon,
  PackageOpenIcon,
  ShoppingBagIcon,
  SparklesIcon,
  UsersIcon,
  CircleDotIcon,
} from "lucide-react";

// Explicit map keeps the bundle small; add icons here when admins can pick new ones.
const ICONS: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardListIcon,
  "monitor-smartphone": MonitorSmartphoneIcon,
  users: UsersIcon,
  "shopping-bag": ShoppingBagIcon,
  "package-open": PackageOpenIcon,
  sparkles: SparklesIcon,
  "list-checks": ListChecksIcon,
  languages: LanguagesIcon,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name]) || CircleDotIcon;
  return <Icon className={className} aria-hidden />;
}
