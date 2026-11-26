import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Short affiliate disclosure. Show wherever affiliate links appear (CLAUDE.md rule 8). */
export function AffiliateNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 text-sm text-muted-foreground",
        className,
      )}
    >
      <InfoIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        8Tasks may earn a commission when you join a provider through our links.
        Providers handle sign-up, tasks and payments, and earnings are never
        guaranteed.{" "}
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
