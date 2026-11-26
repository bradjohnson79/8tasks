import { Section, Text } from "@react-email/components";
import { ActionButton, C, EmailLayout, h1, p, type FooterProps } from "./layout";

export type Daily8Item = {
  title: string;
  providerName: string;
  categoryName: string;
  /** "Provider opportunity" (general sign-up) vs "Specific mission". */
  kindLabel: string;
  /** Verified pay text only, e.g. "$25 USD", "Pay varies", "See provider details". */
  payText: string;
  payIsCash: boolean;
  url: string;
};

export type Daily8Props = {
  variant: "daily" | "weekly";
  intro: string;
  items: Daily8Item[];
  siteUrl: string;
  discoverUrl: string;
  footer: FooterProps;
};

/** My Daily 8 / My Weekly 8. Readable with images off (no images used). */
export default function Daily8Email({ variant, intro, items, discoverUrl, footer }: Daily8Props) {
  const title = variant === "daily" ? "My Daily 8" : "My Weekly 8";
  return (
    <EmailLayout
      preview={`${items.length} earning ${items.length === 1 ? "opportunity" : "opportunities"} picked for you`}
      footer={footer}
    >
      <Text style={h1}>{title}</Text>
      <Text style={{ ...p, color: C.emerald, fontWeight: 600, margin: "0 0 12px" }}>
        A new day. New possibilities.
      </Text>
      <Text style={p}>{intro}</Text>
      {items.map((it, i) => (
        <Section
          key={i}
          style={{
            backgroundColor: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 16,
            margin: "0 0 12px",
          }}
        >
          <Text style={{ fontSize: 12, color: C.text2, margin: "0 0 4px" }}>
            {it.categoryName} · {it.kindLabel}
          </Text>
          <Text
            style={{
              fontSize: 17,
              lineHeight: "23px",
              fontWeight: 600,
              color: C.text,
              margin: "0 0 2px",
            }}
          >
            {it.title}
          </Text>
          <Text style={{ fontSize: 13, color: C.text2, margin: "0 0 10px" }}>
            {it.providerName}
          </Text>
          <Text
            style={{
              fontSize: it.payIsCash ? 18 : 14,
              fontWeight: 700,
              color: it.payIsCash ? C.emerald : C.text,
              margin: "0 0 12px",
            }}
          >
            {it.payText}
          </Text>
          <ActionButton href={it.url}>
            {it.kindLabel === "Specific mission" ? "Explore Mission" : "Explore Opportunity"}
          </ActionButton>
        </Section>
      ))}
      <Text style={{ ...p, margin: "20px 0 12px" }}>
        Want more? Browse every verified opportunity on 8Tasks.
      </Text>
      <ActionButton href={discoverUrl}>Discover more on 8Tasks</ActionButton>
    </EmailLayout>
  );
}
