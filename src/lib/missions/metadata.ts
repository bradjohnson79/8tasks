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
  | "availability"
  | "deadline"
  | "closed"
  | "local-assignment"
  | "camera"
  | "product-supplied"
  | "qualification"
  | "written"
  | "video"
  | "photo"
  | "private-feedback"
  | "public"
  | "sponsorship-disclosure";

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
const dateFmt = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Vancouver",
});

/** "Closes Dec 3, 2026" / "Closed". Only from a real provider deadline. */
export function deadlineLabel(o: Opportunity, now = new Date()): MetaItem | undefined {
  if (!o.deadlineAt) return undefined;
  const d = new Date(o.deadlineAt);
  return d.getTime() <= now.getTime()
    ? { key: "closed", label: "Closed" }
    : { key: "deadline", label: `Closes ${dateFmt.format(d)}` };
}

export function isClosed(o: Opportunity, now = new Date()): boolean {
  return !!o.deadlineAt && new Date(o.deadlineAt).getTime() <= now.getTime();
}

/** "Last verified Nov 26, 2026" from a YYYY-MM-DD date. */
export function formatVerified(date: string): string {
  return `Last verified ${dateFmt.format(new Date(`${date}T12:00:00Z`))}`;
}

export function allMetadata(o: Opportunity, now = new Date()): MetaItem[] {
  const a = o.attributes;
  const out: MetaItem[] = [];
  const deadline = deadlineLabel(o, now);
  if (deadline) out.push(deadline);
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
  if (a.qualificationRequired)
    out.push({ key: "qualification", label: "Professional experience required" });
  if (a.applicationRequired) out.push({ key: "application", label: "Application required" });
  if (a.assessmentRequired) out.push({ key: "assessment", label: "Qualification test" });
  if (
    a.reimbursementAvailable &&
    o.compensation.type !== "payment_plus_reimbursement" &&
    o.compensation.type !== "reimbursement_only"
  )
    out.push({ key: "reimbursed", label: "Reimbursement available" });
  if (a.purchaseRequired === false) out.push({ key: "no-purchase", label: "No purchase needed" });
  if (a.productSupplied)
    out.push({ key: "product-supplied", label: "Product supplied (not cash)" });
  if (a.localAssignment && !a.inPerson)
    out.push({ key: "local-assignment", label: "Local assignment" });
  if (a.cameraRequired) out.push({ key: "camera", label: "Camera needed" });
  if (a.photoDeliverable) out.push({ key: "photo", label: "Photo deliverable" });
  if (a.videoDeliverable) out.push({ key: "video", label: "Video deliverable" });
  if (a.writtenDeliverable) out.push({ key: "written", label: "Written deliverable" });
  if (a.privateFeedback) out.push({ key: "private-feedback", label: "Private feedback" });
  if (a.publicPublication) out.push({ key: "public", label: "Published publicly" });
  if (a.sponsorshipDisclosureRequired)
    out.push({ key: "sponsorship-disclosure", label: "Ad disclosure required" });
  if (a.smartphoneRequired && a.computerRequired === false)
    out.push({ key: "smartphone", label: "Smartphone only" });
  else if (a.computerRequired) out.push({ key: "computer", label: "Computer required" });
  if (o.kind === "provider") out.push({ key: "availability", label: "Subject to eligibility" });
  if (o.countries.length) out.push({ key: "country", label: o.countries.join(" · ") });
  return out;
}

export function cardMetadata(o: Opportunity, max = 3, now = new Date()): MetaItem[] {
  return allMetadata(o, now).slice(0, max);
}
