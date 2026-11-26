import { Text } from "@react-email/components";
import { ActionButton, EmailLayout, h1, p, type FooterProps } from "./layout";

/**
 * One reusable shape for short emails (confirm, welcome, alerts, account, partner, admin).
 * Each named template below fixes its wording so copy stays consistent and reviewable.
 */
export type SimpleEmailProps = {
  preview: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  afterAction?: string[];
  footer: FooterProps;
};

export default function SimpleEmail(props: SimpleEmailProps) {
  return (
    <EmailLayout preview={props.preview} footer={props.footer}>
      <Text style={h1}>{props.heading}</Text>
      {props.paragraphs.map((t, i) => (
        <Text key={i} style={p}>
          {t}
        </Text>
      ))}
      {props.action && <ActionButton href={props.action.href}>{props.action.label}</ActionButton>}
      {props.afterAction?.map((t, i) => (
        <Text key={i} style={{ ...p, marginTop: 16 }}>
          {t}
        </Text>
      ))}
    </EmailLayout>
  );
}
