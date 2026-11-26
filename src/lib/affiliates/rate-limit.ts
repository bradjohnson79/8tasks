/**
 * Small fixed-window limiter per key (IP). Per server instance only — a guard against
 * floods and secret guessing, not a global quota. Upgrade to a shared store if needed.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function allow(key: string, limit = 60, windowMs = 60_000, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= limit;
}
