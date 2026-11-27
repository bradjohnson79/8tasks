import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "./csv";
import { earningsEntrySchema } from "./entries";
import { chunkWindows, resolvePeriod, zonedMidnight } from "./period";
import { parsePostback, safeEqual, scrub } from "./postbacks";
import { isEarning, rollup, totalsByCurrency, type ProgramInfo, type TxRow } from "./rollup";

const prog = (id: string, extra: Partial<ProgramInfo> = {}): ProgramInfo => ({
  id,
  name: id,
  network: "direct",
  status: "live",
  payoutMethod: null,
  lastPayoutAt: null,
  lastPayoutMethod: null,
  ...extra,
});
const tx = (p: Partial<TxRow>): TxRow => ({
  programId: "joinbrands",
  network: "direct",
  type: "conversion",
  status: "pending",
  currency: "USD",
  commissionAmount: 0,
  clicks: null,
  conversions: null,
  source: "manual",
  syncedAt: new Date("2026-11-20T00:00:00Z"),
  ...p,
});

describe("rollup", () => {
  it("separates statuses and currencies, never mixing CAD and USD", () => {
    const stats = rollup(
      [prog("joinbrands", { payoutMethod: "PayPal" }), prog("panelplace", { network: "awin" })],
      [
        tx({ status: "pending", commissionAmount: 30 }),
        tx({ status: "approved", commissionAmount: 5 }),
        tx({ status: "reversed", commissionAmount: 30 }),
        tx({ programId: "panelplace", currency: "CAD", status: "paid", commissionAmount: 2.5 }),
      ],
    );
    expect(stats).toEqual([
      expect.objectContaining({
        programId: "joinbrands",
        currency: "USD",
        pending: 30,
        approved: 5,
        paid: 0,
        conversions: 2,
        payoutMethod: "PayPal",
      }),
      expect.objectContaining({ programId: "panelplace", currency: "CAD", paid: 2.5 }),
    ]);
    expect(totalsByCurrency(stats)).toEqual([
      { currency: "CAD", pending: 0, approved: 0, paid: 2.5 },
      { currency: "USD", pending: 30, approved: 5, paid: 0 },
    ]);
  });
  it("keeps clicks unknown (null) unless a source reports them", () => {
    expect(rollup([prog("joinbrands")], [tx({ commissionAmount: 5 })])[0].clicks).toBeNull();
    expect(
      rollup(
        [prog("joinbrands")],
        [tx({ type: "summary", clicks: 40, conversions: 3, commissionAmount: 15 })],
      )[0],
    ).toMatchObject({ clicks: 40, conversions: 3 });
  });
  it("counts payout rows as paid only when no per-transaction paid rows exist", () => {
    expect(
      rollup(
        [prog("joinbrands")],
        [tx({ type: "payout", status: "paid", commissionAmount: 50 })],
      )[0].paid,
    ).toBe(50);
    expect(
      rollup(
        [prog("joinbrands")],
        [
          tx({ status: "paid", commissionAmount: 20 }),
          tx({ type: "payout", status: "paid", commissionAmount: 20 }),
        ],
      )[0].paid,
    ).toBe(20);
  });
  it("flags earning programs", () => {
    const [s] = rollup(
      [prog("joinbrands")],
      [tx({ type: "summary", clicks: 10, conversions: 0, commissionAmount: 0 })],
    );
    expect(isEarning(s)).toBe(false);
  });
});

describe("periods (America/Vancouver)", () => {
  const local = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Vancouver",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(d);
  it("starts and ends the month at Vancouver midnight (whatever the tz rules say)", () => {
    const p = resolvePeriod("month", new Date("2026-11-26T05:00:00Z")); // Nov 25 evening in Vancouver
    expect(local(p.start)).toBe("2026-11-01, 00:00");
    expect(local(p.end)).toBe("2026-12-01, 00:00");
    expect(p.label).toMatch(/November 2026/);
  });
  it("handles offset changes in zonedMidnight", () => {
    expect(zonedMidnight({ y: 2026, m: 7, d: 1 }).toISOString()).toBe("2026-07-01T07:00:00.000Z"); // PDT
    expect(zonedMidnight({ y: 2026, m: 1, d: 1 }).toISOString()).toBe("2026-01-01T08:00:00.000Z"); // PST
    expect(local(zonedMidnight({ y: 2027, m: 1, d: 15 }))).toBe("2027-01-15, 00:00");
  });
  it("falls back to this month for a bad custom range", () => {
    expect(
      resolvePeriod("custom", new Date("2026-11-26T05:00:00Z"), "2026-12-05", "2026-12-01").kind,
    ).toBe("month");
  });
  it("chunks windows to API caps", () => {
    const w = chunkWindows(new Date("2026-01-01T00:00:00Z"), new Date("2026-03-15T00:00:00Z"), 31);
    expect(w).toHaveLength(3);
    expect(w.every((x) => x.to.getTime() - x.from.getTime() <= 31 * 86_400_000)).toBe(true);
  });
});

describe("CSV", () => {
  it("parses quotes, commas and CRLF", () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'he said "hi"'],
    ]);
    expect(parseCsv(toCsv([["a,b", 'q"']]))).toEqual([["a,b", 'q"']]);
  });
  it("validates template rows and infers summary rows", () => {
    const ok = earningsEntrySchema.parse({
      program_id: "joinbrands",
      event_date: "2026-11-25",
      status: "Confirmed",
      clicks: "12",
      conversions: "1",
      commission_amount: "30",
      currency: "usd",
      payout_method: "",
      payout_date: "",
      external_id: "",
      notes: "",
    });
    expect(ok).toMatchObject({
      status: "approved",
      type: "summary",
      clicks: 12,
      currency: "USD",
      commission_amount: 30,
    });
    expect(
      earningsEntrySchema.safeParse({
        program_id: "x",
        event_date: "11/25/2026",
        status: "paid",
        currency: "USD",
      }).success,
    ).toBe(false);
    expect(
      earningsEntrySchema.safeParse({
        program_id: "x",
        event_date: "2026-11-25",
        status: "maybe",
        currency: "USD",
      }).success,
    ).toBe(false);
  });
});

describe("postbacks", () => {
  it("parses MaxBounty s2/rate and builds a stable dedupe key", () => {
    const p = parsePostback("maxbounty", {
      program: "swagbucks",
      s2: "abc123",
      rate: "1.50",
      key: "secret",
    });
    expect(p).toMatchObject({
      programId: "swagbucks",
      clickId: "abc123",
      commission: 1.5,
      currency: "USD",
      externalId: "click:abc123:1.5",
      status: "pending",
    });
    expect(p.raw.key).toBeUndefined();
  });
  it("parses FlexOffers macros and Impact notifications", () => {
    expect(
      parsePostback("flexoffers", {
        program: "yoursurveys",
        currency: "usd",
        fobs: "c1",
        flx_salesid: "S9",
        ca: "2.00",
        sa: "0",
      }),
    ).toMatchObject({
      externalId: "S9",
      clickId: "c1",
      commission: 2,
      currency: "USD",
    });
    expect(
      parsePostback("impact", {
        campaign_id: "123",
        action_id: "A1",
        status: "APPROVED",
        payout: "4.2",
        currency: "USD",
      }),
    ).toMatchObject({
      campaignId: "123",
      externalId: "A1",
      status: "approved",
      commission: 4.2,
    });
  });
  it("rejects junk ids and scrubs secrets", () => {
    expect(
      parsePostback("generic", { program: "x", external_id: "<script>", currency: "USD" })
        .externalId,
    ).toBeUndefined();
    expect(scrub({ token: "t", secret: "s", ok: "1" })).toEqual({ ok: "1" });
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
  });
});
