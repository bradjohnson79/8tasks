import Link from "next/link";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/** Shown wherever affiliate links appear (CLAUDE.md rule 8). */
export function AffiliateDisclosure({
  className,
  compact = false,
  siteWide = false,
}: {
  className?: string;
  compact?: boolean;
  /** Footer wording (founder-approved 2026-11-26). */
  siteWide?: boolean;
}) {
  return (
    <p className={cn("flex items-start gap-2 text-[13px] leading-relaxed text-text-2", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {siteWide
          ? "8Tasks is always free to use. We may earn a commission from qualifying referrals to participating providers."
          : compact
            ? "8Tasks may earn a commission from providers. Providers pay you directly; earnings aren't guaranteed."
            : "8Tasks may earn a commission when you join a provider through our links. Providers handle sign-up, tasks, verification and payment, and pay you directly. Earnings are never guaranteed."}{" "}
        <Link
          href="/legal/affiliate-disclosure"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Learn more
        </Link>
      </span>
    </p>
  );
}
