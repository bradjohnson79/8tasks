import type { Opportunity } from "./types";

export type MetaKey =
  | "duration"
  | "remote"
  | "in-person"
  | "location"
  | "purchase"
  | "no-purchase"
  | "reimbursed"
  | "audience"
  | "no-audience"
  | "portfolio"
  | "beginner"
  | "application"
  | "assessment"
  | "smartphone"
  | "computer"
  | "country"
  | "availability";

export type MetaItem = { key: MetaKey; label: string };

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/**
 * Every verified fact about a listing, in priority order. Cards show the first 2–3
 * (design update §11); the detail page shows them all. Unknown facts are never shown.
 */
export function allMetadata(o: Opportunity): MetaItem[] {
  const a = o.attributes;
  const out: MetaItem[] = [];
  if (o.durationMinutes !== undefined)
    out.push({ key: "duration", label: formatDuration(o.durationMinutes) });
  const city = o.locations?.find((l) => l.city);
  if (city) out.push({ key: "location", label: `${city.city}, ${city.region}` });
  else if (a.inPerson) out.push({ key: "in-person", label: "In person" });
  if (a.remote) out.push({ key: "remote", label: a.online === false ? "By phone" : "From home" });
  // Disclosures that change the decision come before nice-to-haves.
  if (a.purchaseRequired) out.push({ key: "purchase", label: "Purchase required" });
  if (a.audienceRequired) out.push({ key: "audience", label: "Audience required" });
  if (a.audienceRequired === false) out.push({ key: "no-audience", label: "No followers needed" });
  if (a.portfolioRequired) out.push({ key: "portfolio", label: "Portfolio required" });
  if (a.beginnerFriendly) out.push({ key: "beginner", label: "Beginner friendly" });
  if (a.applicationRequired) out.push({ key: "application", label: "Application required" });
  if (a.assessmentRequired) out.push({ key: "assessment", label: "Qualification test" });
  if (
    a.reimbursementAvailable &&
    o.compensation.type !== "payment_plus_reimbursement" &&
    o.compensation.type !== "reimbursement_only"
  )
    out.push({ key: "reimbursed", label: "Reimbursement available" });
  if (a.purchaseRequired === false) out.push({ key: "no-purchase", label: "No purchase needed" });
  if (a.smartphoneRequired && a.computerRequired === false)
    out.push({ key: "smartphone", label: "Smartphone only" });
  else if (a.computerRequired) out.push({ key: "computer", label: "Computer required" });
  if (o.kind === "provider") out.push({ key: "availability", label: "Subject to eligibility" });
  if (o.countries.length) out.push({ key: "country", label: o.countries.join(" · ") });
  return out;
}

export function cardMetadata(o: Opportunity, max = 3): MetaItem[] {
  return allMetadata(o).slice(0, max);
}
