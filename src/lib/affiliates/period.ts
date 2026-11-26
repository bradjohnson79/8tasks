/**
 * Period boundaries in America/Vancouver (spec §2.3, §10). Instants are UTC.
 */
export const FEED_TZ = "America/Vancouver";

type Ymd = { y: number; m: number; d: number };

function partsIn(tz: string, at: Date): Ymd {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

/** UTC instant of local midnight on y-m-d in `tz`. */
export function zonedMidnight({ y, m, d }: Ymd, tz = FEED_TZ): Date {
  const guess = Date.UTC(y, m - 1, d);
  const offsetAt = (t: number) => {
    const name = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
      .formatToParts(new Date(t))
      .find((x) => x.type === "timeZoneName")!.value; // e.g. GMT-08:00
    const mm = name.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!mm) return 0;
    const sign = mm[1] === "-" ? -1 : 1;
    return sign * (Number(mm[2]) * 60 + Number(mm[3] ?? 0)) * 60_000;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t); // second pass handles DST edges
  return new Date(t);
}

export type PeriodKind = "month" | "last30" | "custom";
export type Period = {
  kind: PeriodKind;
  start: Date;
  end: Date;
  label: string;
  from: string;
  to: string;
};

const ymdString = ({ y, m, d }: Ymd) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const parseYmd = (s?: string): Ymd | undefined => {
  const mm = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!mm) return undefined;
  const v = { y: Number(mm[1]), m: Number(mm[2]), d: Number(mm[3]) };
  return v.m >= 1 && v.m <= 12 && v.d >= 1 && v.d <= 31 ? v : undefined;
};
const addDays = ({ y, m, d }: Ymd, n: number): Ymd => {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};

/** [start, end) for the chosen period. Default: current calendar month in Vancouver. */
export function resolvePeriod(
  kind: string | undefined,
  now = new Date(),
  from?: string,
  to?: string,
): Period {
  const today = partsIn(FEED_TZ, now);
  if (kind === "last30") {
    const s = addDays(today, -29);
    const e = addDays(today, 1);
    return {
      kind,
      start: zonedMidnight(s),
      end: zonedMidnight(e),
      label: "Last 30 days",
      from: ymdString(s),
      to: ymdString(today),
    };
  }
  if (kind === "custom") {
    const s = parseYmd(from);
    const e = parseYmd(to);
    if (s && e && ymdString(s) <= ymdString(e)) {
      return {
        kind,
        start: zonedMidnight(s),
        end: zonedMidnight(addDays(e, 1)),
        label: `${ymdString(s)} to ${ymdString(e)}`,
        from: ymdString(s),
        to: ymdString(e),
      };
    }
  }
  const s = { y: today.y, m: today.m, d: 1 };
  const next =
    today.m === 12 ? { y: today.y + 1, m: 1, d: 1 } : { y: today.y, m: today.m + 1, d: 1 };
  const label = new Intl.DateTimeFormat("en-CA", {
    timeZone: FEED_TZ,
    month: "long",
    year: "numeric",
  }).format(now);
  return {
    kind: "month",
    start: zonedMidnight(s),
    end: zonedMidnight(next),
    label,
    from: ymdString(s),
    to: ymdString(addDays(next, -1)),
  };
}

export function formatVancouver(at: Date | null | undefined, withTime = true): string {
  if (!at) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FEED_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "2-digit", minute: "2-digit", hour12: false, timeZoneName: "short" }
      : {}),
  }).format(at);
}

/** Splits [from, to) into windows no longer than maxDays (API caps: Impact 45, Awin/CJ 31). */
export function chunkWindows(from: Date, to: Date, maxDays: number): { from: Date; to: Date }[] {
  const out: { from: Date; to: Date }[] = [];
  const step = maxDays * 86_400_000;
  for (let t = from.getTime(); t < to.getTime(); t += step) {
    out.push({ from: new Date(t), to: new Date(Math.min(t + step, to.getTime())) });
  }
  return out;
}
