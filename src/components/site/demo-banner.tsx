import { shouldShowDemoData } from "@/lib/demo";

/** Visible whenever demo rows can render, so they are never mistaken for real listings. */
export function DemoBanner() {
  if (!shouldShowDemoData()) return null;
  return (
    <div className="bg-amber-300 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      Development preview: demo providers and listings are shown. They are not
      real and never appear in production.
    </div>
  );
}
