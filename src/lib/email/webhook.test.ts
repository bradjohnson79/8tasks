import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isPermanentBounce, verifyResendWebhook } from "./webhook";

const key = Buffer.from("test-signing-key-0123456789");
const secret = `whsec_${key.toString("base64")}`;
const sign = (id: string, ts: string, body: string) =>
  `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;

describe("Resend webhook verification", () => {
  const now = 1_800_000_000_000;
  const ts = String(now / 1000);
  const body = '{"type":"email.bounced"}';
  it("accepts a valid signature and rejects tampering, wrong secret and stale timestamps", () => {
    const h = { id: "msg_1", timestamp: ts, signature: sign("msg_1", ts, body) };
    expect(verifyResendWebhook(secret, h, body, now)).toBe(true);
    expect(verifyResendWebhook(secret, h, body + " ", now)).toBe(false);
    expect(
      verifyResendWebhook("whsec_" + Buffer.from("other").toString("base64"), h, body, now),
    ).toBe(false);
    expect(verifyResendWebhook(secret, h, body, now + 10 * 60_000)).toBe(false);
    expect(verifyResendWebhook(secret, { ...h, signature: null }, body, now)).toBe(false);
    expect(
      verifyResendWebhook(secret, { ...h, signature: `v1,bad ${h.signature}` }, body, now),
    ).toBe(true);
  });
  it("only suppresses permanent bounces", () => {
    expect(isPermanentBounce({ bounce: { type: "Permanent" } })).toBe(true);
    expect(isPermanentBounce({ bounce: { type: "Transient" } })).toBe(false);
    expect(isPermanentBounce({})).toBe(true);
  });
});
