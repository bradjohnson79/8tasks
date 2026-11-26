import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Resend webhook (Svix format): HMAC-SHA256 over "id.timestamp.body" with the
 * base64 secret after "whsec_", compared against every "v1,<sig>" in svix-signature.
 * Rejects timestamps more than 5 minutes off.
 */
export function verifyResendWebhook(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > 300) return false;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Bounces that should stop future mail: anything not explicitly temporary. */
export function isPermanentBounce(data: { bounce?: { type?: string } } | undefined): boolean {
  const t = data?.bounce?.type?.toLowerCase();
  return t !== "transient" && t !== "temporary" && t !== "undetermined";
}
