import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

/** 8Tasks email palette (email-safe hex values, inline styles only). */
export const C = {
  bg: "#131B2B",
  card: "#202C3E",
  emerald: "#53E6A0",
  text: "#F1F5F9",
  text2: "#9DAABD",
  actionBg: "#294D40",
  actionText: "#83EFBA",
  border: "#354258",
};
export const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type FooterProps = {
  /** Promotional mail must carry sender id, postal address and unsubscribe. */
  kind: "promotional" | "transactional";
  senderName: string;
  postalAddress?: string | null;
  preferencesUrl?: string;
  unsubscribeUrl?: string;
  siteUrl: string;
};

export function EmailLayout({
  preview,
  children,
  footer,
}: {
  preview: string;
  children: React.ReactNode;
  footer: FooterProps;
}) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: C.bg, margin: 0, padding: "24px 0", fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
          <Text style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: C.text }}>
            <span style={{ color: C.emerald }}>8</span>Tasks
            <span style={{ color: C.text2, fontSize: 14, fontWeight: 500 }}>.com</span>
          </Text>
          {children}
          <Hr style={{ borderColor: C.border, margin: "28px 0 16px" }} />
          <Footer {...footer} />
        </Container>
      </Body>
    </Html>
  );
}

function Footer(f: FooterProps) {
  const small = { fontSize: 12, lineHeight: "18px", color: C.text2, margin: "0 0 8px" };
  return (
    <Section>
      <Text style={{ ...small, color: C.text, fontWeight: 600 }}>
        8Tasks.com — Small Missions. Real Money.
      </Text>
      <Text style={{ ...small, color: C.emerald, fontWeight: 600 }}>
        Always Free. For Everyone.
      </Text>
      {f.kind === "promotional" && (
        <Text style={small}>
          8Tasks may earn a referral commission when you join a provider through our links. It never
          changes what the provider pays you. Earnings are never guaranteed.
        </Text>
      )}
      <Text style={small}>
        Sent by {f.senderName}
        {f.postalAddress ? `, ${f.postalAddress}` : ""}.
      </Text>
      {(f.preferencesUrl || f.unsubscribeUrl) && (
        <Text style={small}>
          {f.preferencesUrl && (
            <Link href={f.preferencesUrl} style={{ color: C.actionText }}>
              Manage preferences
            </Link>
          )}
          {f.preferencesUrl && f.unsubscribeUrl && " · "}
          {f.unsubscribeUrl && (
            <Link href={f.unsubscribeUrl} style={{ color: C.actionText }}>
              Unsubscribe
            </Link>
          )}
        </Text>
      )}
    </Section>
  );
}

export function ActionButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        backgroundColor: C.actionBg,
        color: C.actionText,
        fontWeight: 600,
        fontSize: 15,
        padding: "12px 20px",
        borderRadius: 10,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}

export const h1 = {
  fontSize: 26,
  lineHeight: "32px",
  fontWeight: 700,
  color: C.text,
  margin: "0 0 6px",
};
export const p = { fontSize: 15, lineHeight: "22px", color: C.text2, margin: "0 0 16px" };
