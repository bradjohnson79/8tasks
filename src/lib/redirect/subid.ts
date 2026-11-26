/**
 * Documented SubID parameters by network (spec §4.2). An admin picks one per affiliate
 * link; null means the link is used exactly as stored (direct programs).
 */
export const SUBID_PARAMS = [
  { value: "subId1", label: "subId1 (Impact)" },
  { value: "clickRef", label: "clickRef (Awin; confirm in-account)" },
  { value: "fobs", label: "fobs (FlexOffers)" },
  { value: "s2", label: "s2 (MaxBounty)" },
  { value: "sid", label: "sid (CJ; confirm in-account)" },
] as const;

const ALLOWED = new Set<string>(SUBID_PARAMS.map((p) => p.value));

/** Appends our opaque click id to the stored URL only when a documented param is set. */
export function withSubId(url: string, param: string | null, clickId: string): string {
  if (!param || !ALLOWED.has(param) || !/^[0-9a-f-]{36}$/.test(clickId)) return url;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return url;
    u.searchParams.set(param, clickId.replace(/-/g, ""));
    return u.toString();
  } catch {
    return url;
  }
}
