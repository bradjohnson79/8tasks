/**
 * Copies the founder's site_links.json into data/site_links.json keeping ONLY the fields the
 * site renders. Commission notes, deal terms and research notes are dropped because this
 * repository is public.
 *   npx tsx scripts/build-site-links.ts /path/to/site_links.json
 */
import { readFileSync, writeFileSync } from "node:fs";

const KEEP = [
  "provider_id",
  "provider",
  "category",
  "subsection",
  "status",
  "affiliate_url",
  "sample_url",
  "disclosure_needed",
  "audience",
  "placement",
  "reward_type",
  "last_verified",
  "sponsored",
] as const;

const src = process.argv[2];
if (!src) throw new Error("Usage: npx tsx scripts/build-site-links.ts <site_links.json>");
const data = JSON.parse(readFileSync(src, "utf8"));
const rows: Record<string, unknown>[] = Array.isArray(data) ? data : data.providers;
const out = {
  _note:
    "Public copy of the founder's link map (scripts/build-site-links.ts). Commercial terms are omitted on purpose. Rebuild instead of editing.",
  generated: data.generated ?? null,
  policy: data.policy ?? null,
  taxonomy: data.taxonomy ?? null,
  providers: rows.map((r) => Object.fromEntries(KEEP.filter((k) => k in r).map((k) => [k, r[k]]))),
};
writeFileSync("data/site_links.json", JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${out.providers.length} rows (commercial fields removed).`);
