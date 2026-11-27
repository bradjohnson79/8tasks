import { z } from "zod";
import { REGIONS } from "@/lib/taxonomy";
import { COMPENSATION_TYPES } from "@/lib/validation/admin";

export const FREQUENCIES = [
  { value: "daily", label: "Daily (My Daily 8)" },
  { value: "weekly", label: "Weekly (My Weekly 8)" },
  { value: "alerts", label: "Only matching new opportunities (starting soon)" },
  { value: "website_only", label: "No emails — website only" },
] as const;
export const EQUIPMENT = [
  { value: "smartphone", label: "Smartphone" },
  { value: "computer", label: "Computer" },
  { value: "camera", label: "Camera" },
] as const;
export const COMPENSATION_CHOICES = [
  { value: "fixed", label: "Fixed payment" },
  { value: "range", label: "Payment range" },
  { value: "hourly", label: "Hourly" },
  { value: "commission", label: "Commission" },
  { value: "variable", label: "Varies per job" },
  { value: "gift_card", label: "Gift cards" },
  { value: "free_product", label: "Free products" },
] as const;

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(60);
const validTz = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Base preference fields (shared with account profiles). */
export const prefsObject = z.object({
  frequency: z.enum(["daily", "weekly", "alerts", "website_only"]).default("daily"),
  country: z.union([z.literal(""), z.enum(["CA", "US"])]).default(""),
  region: z.string().trim().max(10).default(""),
  city: z.string().trim().max(80).default(""),
  categories: z.array(slug).max(12).default([]),
  creativeInterests: z.array(slug).max(12).default([]),
  workMode: z.enum(["any", "remote", "local"]).default("any"),
  beginnerOnly: z.boolean().default(false),
  equipment: z
    .array(z.enum(["smartphone", "computer", "camera"]))
    .max(3)
    .default([]),
  compensationTypes: z.array(z.enum(COMPENSATION_TYPES)).max(15).default([]),
  searchQuery: z.string().trim().max(200).default(""),
  timeZone: z
    .string()
    .max(60)
    .default("America/Vancouver")
    .transform((v) => (validTz(v) ? v : "America/Vancouver")),
});

/** A region must belong to the chosen country. */
export const fixRegion = <T extends { country: "" | "CA" | "US"; region: string }>(p: T): T => ({
  ...p,
  region: p.country && REGIONS[p.country].some((r) => r.code === p.region) ? p.region : "",
});

/** Subscriber preferences, validated before they reach the database functions. */
export const prefsSchema = prefsObject.transform(fixRegion);

export type EmailPrefs = z.output<typeof prefsSchema>;

/** FormData → prefs input (checkbox groups become arrays). */
export function prefsFromForm(form: FormData) {
  return {
    frequency: form.get("frequency") ?? undefined,
    country: form.get("country") ?? "",
    region: form.get("region") ?? "",
    city: form.get("city") ?? "",
    categories: form.getAll("categories").map(String),
    creativeInterests: form.getAll("creativeInterests").map(String),
    workMode: form.get("workMode") ?? undefined,
    beginnerOnly: form.get("beginnerOnly") === "on",
    equipment: form.getAll("equipment").map(String),
    compensationTypes: form.getAll("compensationTypes").map(String),
    searchQuery: form.get("searchQuery") ?? "",
    timeZone: form.get("timeZone") || undefined,
  };
}
