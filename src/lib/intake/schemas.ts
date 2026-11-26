import { z } from "zod";

/** Report reasons (master prompt §3.6.9). Values match the report_reason DB enum. */
export const REPORT_REASONS = [
  { value: "broken_link", label: "Broken link" },
  { value: "expired", label: "Expired or no longer available" },
  { value: "incorrect_pay", label: "Incorrect pay information" },
  { value: "incorrect_location", label: "Incorrect location or eligibility" },
  { value: "registration_closed", label: "Registration closed" },
  { value: "undisclosed_costs", label: "Undisclosed costs or purchases" },
  { value: "misleading", label: "Misleading description" },
  { value: "suspicious", label: "Suspicious activity" },
  { value: "other", label: "Other" },
] as const;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, "Enter a valid email address");
const optionalEmail = z
  .union([z.literal(""), email])
  .optional()
  .transform((v) => v || null);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .transform((v) => v || null);

export const reportSchema = z.object({
  opportunityId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  providerId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]], {
    message: "Choose what's wrong",
  }),
  details: optionalText(2000),
  contactEmail: optionalEmail,
});

export const submissionSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name").max(120),
  websiteUrl: z
    .string()
    .trim()
    .max(300)
    .transform((v) => (/^https?:\/\//i.test(v) ? v : `https://${v}`))
    .pipe(z.url({ message: "Enter the company's website", protocol: /^https?$/ })),
  contactName: optionalText(120),
  contactEmail: email,
  categorySlug: optionalText(60),
  notes: optionalText(2000),
});

export const ALERT_CONSENT =
  "Yes, email me free 8Tasks opportunity alerts. I can unsubscribe at any time.";

export const alertSchema = z.object({
  email,
  categories: z
    .array(z.string().regex(/^[a-z0-9-]{1,60}$/))
    .max(8)
    .default([]),
  q: optionalText(200),
  frequency: z.enum(["daily", "weekly"]).default("weekly"),
  consent: z.literal("yes", { message: "Tick the box to agree to receive alerts" }),
});
