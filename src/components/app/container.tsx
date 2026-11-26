import { cn } from "@/lib/utils";

/** Centered content column: 16px gutters on mobile, max ~1280px on desktop (design spec §7). */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}

export function SectionHeader({
  title,
  action,
  id,
  description,
}: {
  title: string;
  id?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
