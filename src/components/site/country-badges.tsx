import { Badge } from "@/components/ui/badge";
import { isSupportedCountry } from "@/lib/markets";

/** Shows only launch-market countries, e.g. "CA · US". */
export function CountryBadges({ countries }: { countries: string[] }) {
  const shown = countries.filter(isSupportedCountry);
  if (shown.length === 0) return null;
  return (
    <Badge
      variant="outline"
      title={shown.length === 2 ? "Available in Canada and the US" : undefined}
    >
      {shown.join(" · ")}
    </Badge>
  );
}
