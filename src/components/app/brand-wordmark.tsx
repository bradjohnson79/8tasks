import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Interim wordmark (design spec §3): "8" emerald, "Tasks" white, ".com" muted.
 * Replace this one component when the final logo is approved.
 */
export function BrandWordmark({
  className,
  showDotCom = true,
  href = "/",
}: {
  className?: string;
  showDotCom?: boolean;
  href?: string | null;
}) {
  const mark = (
    <span className={cn("inline-flex items-baseline text-xl font-bold tracking-tight", className)}>
      <span className="text-emerald">8</span>
      <span className="text-foreground">Tasks</span>
      {showDotCom && <span className="ml-px text-sm font-medium text-text-2">.com</span>}
    </span>
  );
  if (href === null) return mark;
  return (
    <Link href={href} aria-label="8Tasks home" className="rounded-md">
      {mark}
    </Link>
  );
}
