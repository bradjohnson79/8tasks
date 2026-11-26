import "server-only";
import { render } from "@react-email/render";
import { Resend } from "resend";
import { emailConfig } from "./config";

export type Outgoing = {
  from: string;
  to: string;
  subject: string;
  react: React.ReactElement;
  /** One-click unsubscribe (RFC 8058) for promotional mail. */
  unsubscribeUrl?: string;
  idempotencyKey?: string;
  /** Overrides EMAIL_REPLY_TO (e.g. from admin settings). */
  replyTo?: string | null;
  tags?: { name: string; value: string }[];
};

export type DeliveryResult =
  { mode: "sent"; id: string } | { mode: "dry_run" } | { mode: "failed"; error: string };

export async function renderEmail(react: React.ReactElement) {
  const [html, text] = await Promise.all([render(react), render(react, { plainText: true })]);
  return { html, text };
}

let client: Resend | undefined;

/**
 * Sends through Resend when `live` and a key is configured; otherwise renders only (dry run).
 * Never logs the API key or full payloads.
 */
export async function deliver(msg: Outgoing, live: boolean): Promise<DeliveryResult> {
  const { html, text } = await renderEmail(msg.react);
  const cfg = emailConfig();
  if (!live || !cfg.apiKey) return { mode: "dry_run" };
  client ??= new Resend(cfg.apiKey);
  const headers: Record<string, string> = {};
  if (msg.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${msg.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  try {
    const { data, error } = await client.emails.send(
      {
        from: msg.from,
        to: msg.to,
        subject: msg.subject,
        html,
        text,
        headers,
        replyTo: msg.replyTo || cfg.replyTo,
        tags: msg.tags,
      },
      msg.idempotencyKey ? { idempotencyKey: msg.idempotencyKey } : undefined,
    );
    if (error || !data) return { mode: "failed", error: error?.message ?? "No response" };
    return { mode: "sent", id: data.id };
  } catch (err) {
    return {
      mode: "failed",
      error: err instanceof Error ? err.message.slice(0, 300) : "Send failed",
    };
  }
}
