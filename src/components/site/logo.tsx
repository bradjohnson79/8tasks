import Link from "next/link";
import { cn } from "@/lib/utils";

/** Placeholder wordmark until final branding is approved. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
      aria-label="8Tasks home"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-mint text-sm font-bold text-navy">
        8
      </span>
      <span className="text-lg">
        8<span className="text-mint">Tasks</span>
      </span>
    </Link>
  );
}
