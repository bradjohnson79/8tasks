import { shouldShowDemoData } from "@/lib/demo";

/** Visible whenever demo data can render, so it's never mistaken for real listings. */
export function DemoBanner() {
  if (!shouldShowDemoData()) return null;
  return (
    <div className="bg-warning px-4 py-1.5 text-center text-xs font-semibold text-[#2a1d00]">
      Design preview: listings marked “Demo” are examples, not real opportunities. They never appear
      in production.
    </div>
  );
}
