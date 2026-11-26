import {
  BrainCircuit,
  Camera,
  CircleDot,
  Clapperboard,
  ClipboardList,
  Gamepad2,
  type LucideIcon,
  MessagesSquare,
  ShoppingBag,
  Smartphone,
} from "lucide-react";

/** Icon names an admin can store on a category (categories.icon). */
export const ICONS: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardList,
  smartphone: Smartphone,
  camera: Camera,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  "gamepad-2": Gamepad2,
  "messages-square": MessagesSquare,
  "brain-circuit": BrainCircuit,
};

export function CategoryIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && ICONS[name]) || CircleDot;
  return <Icon className={className} aria-hidden />;
}
