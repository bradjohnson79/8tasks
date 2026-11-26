import { cn } from "@/lib/utils";

/**
 * Provider logo, or an initial tile when no logo is stored.
 * Uses a plain <img>: logo URLs are admin-entered https links on arbitrary hosts.
 */
export function ProviderLogo({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "size-16 rounded-2xl text-2xl" : "size-10 rounded-xl text-base";
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        className={cn(box, "shrink-0 border bg-white object-contain p-1")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        box,
        "grid shrink-0 place-items-center bg-secondary font-semibold text-secondary-foreground",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
