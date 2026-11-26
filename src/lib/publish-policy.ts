/**
 * Who may be published (gap analysis G-30, master prompt §6):
 *  - readiness A: publishable;
 *  - readiness D: only as a founder-flagged "user value" listing with no active affiliate links;
 *  - anything else (B, C, E, not set): stays draft until reviewed.
 * Returns the reason publishing is blocked, or null.
 */
export function providerPublishBlocker(a: {
  readinessLevel: string | null;
  userValueListing: boolean;
  activeAffiliateLinks: number;
}): string | null {
  if (a.readinessLevel === "A") return null;
  if (a.readinessLevel === "D") {
    if (!a.userValueListing)
      return "Level D providers can only be published as a user-value listing (tick the box).";
    if (a.activeAffiliateLinks > 0)
      return "User-value (Level D) listings must not have active affiliate links. Deactivate them first.";
    return null;
  }
  return `Set readiness level A (or D + user-value listing) before publishing. Current: ${a.readinessLevel ?? "not set"}.`;
}
