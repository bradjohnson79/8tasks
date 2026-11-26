import { cn } from "@/lib/utils";

const TONES = {
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
  success: "bg-emerald/15 text-emerald",
  neutral: "bg-elevated text-foreground",
  error: "bg-error/15 text-error",
};

/** Small status label. Always includes text, never colour alone (design spec §24). */
export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
