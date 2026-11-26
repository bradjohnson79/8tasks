import { Info } from "lucide-react";
import type { Opportunity } from "@/lib/missions/types";
import { cn } from "@/lib/utils";
import { AffiliateDisclosure } from "./affiliate-disclosure";

/** Public label for non-affiliate (Level D) listings. Everything on 8Tasks is free to use. */
export const INDEPENDENT_LABEL = "Independent listing";
export const FREE_LISTING_NOTE =
  "8Tasks does not currently receive a commission from this listing.";

/** Free-listing note (shown instead of the affiliate disclosure on non-affiliate listings). */
export function FreeListingNote({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-[13px] leading-relaxed text-text-2", className)}>
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{FREE_LISTING_NOTE}</span>
    </p>
  );
}

/**
 * The right disclosure for a set of listings: the affiliate disclosure whenever any listing
 * may earn 8Tasks a commission (never hidden), and the free-listing note only when free
 * listings are present. Rule 8.
 */
export function ListingDisclosure({
  items,
  className,
}: {
  items: Pick<Opportunity, "isFreeListing">[];
  className?: string;
}) {
  const free = items.filter((o) => o.isFreeListing).length;
  const affiliate = items.length - free;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {affiliate > 0 && <AffiliateDisclosure />}
      {free > 0 &&
        (affiliate > 0 ? (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-text-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              8Tasks does not currently receive a commission from listings marked &ldquo;Independent
              listing&rdquo;. We list them because they&apos;re useful.
            </span>
          </p>
        ) : (
          <FreeListingNote />
        ))}
    </div>
  );
}
