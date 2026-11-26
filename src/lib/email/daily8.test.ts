import { describe, expect, it } from "vitest";
import { DEFAULT_SUBSECTIONS } from "@/lib/discovery/defaults";
import type { Opportunity } from "@/lib/missions/types";
import { daily8Intro, recommendDaily8, type SubscriberPrefs } from "./daily8";

const now = new Date("2026-11-26T16:00:00Z");
let n = 0;
const opp = (o: Partial<Opportunity> = {}): Opportunity => ({
  id: `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`,
  kind: "provider",
  title: `Listing ${n}`,
  categorySlug: "surveys",
  categoryName: "Surveys",
  providerName: `Provider ${n}`,
  providerSlug: `provider-${n}`,
  compensation: { type: "unknown" },
  countries: ["CA", "US"],
  attributes: {},
  isSponsored: false,
  isDemo: false,
  createdAt: "2026-11-01T00:00:00Z",
  hasOutboundLink: true,
  emailAllowed: true,
  ...o,
});
const prefs = (p: Partial<SubscriberPrefs> = {}): SubscriberPrefs => ({
  categories: [],
  creativeInterests: [],
  workMode: "any",
  beginnerOnly: false,
  equipment: [],
  compensationTypes: [],
  ...p,
});
const run = (
  p: SubscriberPrefs,
  items: Opportunity[],
  extra: Partial<Parameters<typeof recommendDaily8>[2]> = {},
) =>
  recommendDaily8(p, items, {
    subsections: DEFAULT_SUBSECTIONS,
    recentlySent: [],
    lastSent: [],
    now,
    ...extra,
  });

describe("My Daily 8 recommendations", () => {
  it("never pads: sends fewer than eight and skips when nothing matches", () => {
    const r = run(prefs(), [opp(), opp()]);
    expect(r.send && r.items.length).toBe(2);
    expect(run(prefs({ categories: ["photography"] }), [opp()])).toEqual({
      send: false,
      reason: "no_matches",
    });
    expect(daily8Intro(2, "daily")).toMatch(/fewer than eight/);
  });

  it("caps at eight, one listing per provider", () => {
    const many = Array.from({ length: 12 }, () => opp());
    const dupes = [opp({ providerSlug: "same" }), opp({ providerSlug: "same" })];
    const r = run(prefs(), [...many, ...dupes]);
    expect(r.send && r.items.length).toBe(8);
    const r2 = run(prefs(), dupes);
    expect(r2.send && r2.items.length).toBe(1);
  });

  it("excludes demo, closed, unlinked, email-restricted and ineligible-country listings", () => {
    const items = [
      opp({ isDemo: true }),
      opp({ deadlineAt: "2026-11-01T00:00:00Z" }),
      opp({ hasOutboundLink: false }),
      opp({ emailAllowed: undefined }),
      opp({ emailAllowed: false }),
      opp({ countries: ["US"] }),
    ];
    expect(run(prefs({ country: "CA" }), items)).toEqual({ send: false, reason: "no_matches" });
  });

  it("applies remote/local, beginner, equipment and compensation preferences (unknown never matches)", () => {
    const remote = opp({ attributes: { remote: true } });
    const local = opp({ attributes: { inPerson: true } });
    const camera = opp({ attributes: { remote: true, cameraRequired: true } });
    const ids = (r: ReturnType<typeof run>) => (r.send ? r.items.map((o) => o.id) : []);
    expect(ids(run(prefs({ workMode: "remote" }), [remote, local, opp()]))).toEqual([remote.id]);
    expect(ids(run(prefs({ workMode: "local" }), [remote, local]))).toEqual([local.id]);
    expect(run(prefs({ beginnerOnly: true }), [remote])).toEqual({
      send: false,
      reason: "no_matches",
    });
    expect(ids(run(prefs({ equipment: ["smartphone"] }), [camera, remote]))).toEqual([remote.id]);
    const gift = opp({ compensation: { type: "gift_card" } });
    expect(ids(run(prefs({ compensationTypes: ["fixed"] }), [gift]))).toEqual([]);
  });

  it("matches creative interests through subsections and secondary categories", () => {
    const ugc = opp({
      categorySlug: "content-media",
      subcategorySlug: "user-generated-content",
      secondary: [{ categorySlug: "photography", subcategorySlug: "product-photos" }],
    });
    const r = run(prefs({ creativeInterests: ["capture-earn"] }), [ugc, opp()]);
    expect(r.send && r.items.map((o) => o.id)).toEqual([ugc.id]);
  });

  it("avoids repetition and skips when nothing changed since the last email", () => {
    const a = opp();
    const b = opp({ createdAt: "2026-11-25T00:00:00Z" });
    const r = run(prefs(), [a, b], { recentlySent: [b.id] });
    expect(r.send && r.items[0].id).toBe(a.id); // recently sent item drops below
    expect(run(prefs(), [a, b], { lastSent: [a.id, b.id] })).toEqual({
      send: false,
      reason: "nothing_new",
    });
  });
});
