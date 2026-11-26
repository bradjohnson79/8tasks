import {
  BrainCircuit,
  Camera,
  CircleDot,
  Clapperboard,
  ClipboardList,
  Gamepad2,
  type LucideIcon,
  MapPin,
  Megaphone,
  MessagesSquare,
  PenLine,
  Repeat,
  ShoppingBag,
  Smartphone,
  Star,
  Video,
  Zap,
} from "lucide-react";

/** Lucide icon names an admin may store on categories and discovery groups. */
export const DISCOVERY_ICONS: Record<string, LucideIcon> = {
  "clipboard-list": ClipboardList,
  smartphone: Smartphone,
  camera: Camera,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  "gamepad-2": Gamepad2,
  "messages-square": MessagesSquare,
  "brain-circuit": BrainCircuit,
  zap: Zap,
  "map-pin": MapPin,
  repeat: Repeat,
  "pen-line": PenLine,
  video: Video,
  star: Star,
  megaphone: Megaphone,
};

export function discoveryIcon(name: string | null | undefined): LucideIcon {
  return (name && DISCOVERY_ICONS[name]) || CircleDot;
}
