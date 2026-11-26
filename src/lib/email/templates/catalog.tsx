import SimpleEmail from "./simple";
import type { FooterProps } from "./layout";

/**
 * Named templates. Promotional (Daily 8, alerts, partner announcements) and transactional
 * (confirmations, account, statements, admin) mail use different senders and footers.
 * Templates never invent figures: anything numeric must be passed in from real data.
 */
type Built = {
  subject: string;
  react: React.ReactElement;
  stream: "promotional" | "transactional";
};

export function confirmSubscriptionEmail(a: { confirmUrl: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Confirm your free My Daily 8 email",
    react: (
      <SimpleEmail
        preview="One click to confirm your free 8Tasks emails"
        heading="Please confirm your email"
        paragraphs={[
          "Someone (hopefully you) asked to receive free My Daily 8 emails from 8Tasks.com: a short list of verified earning opportunities that match your preferences.",
          "Nothing will be sent until you confirm. If this wasn't you, ignore this email.",
        ]}
        action={{ label: "Confirm my email", href: a.confirmUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function welcomeEmail(a: { discoverUrl: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Welcome to 8Tasks",
    react: (
      <SimpleEmail
        preview="You're in. Always free."
        heading="Welcome to 8Tasks"
        paragraphs={[
          "Thanks for confirming. Your first My Daily 8 arrives at your chosen time, and only when we have verified opportunities that fit you. Some days that may be fewer than eight, or none.",
          "8Tasks never charges you. Providers handle sign-up, tasks and payment directly.",
        ]}
        action={{ label: "Explore opportunities", href: a.discoverUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function newMissionAlertEmail(a: {
  title: string;
  providerName: string;
  url: string;
  footer: FooterProps;
}): Built {
  return {
    stream: "promotional",
    subject: `New on 8Tasks: ${a.title}`,
    react: (
      <SimpleEmail
        preview={`${a.providerName}: ${a.title}`}
        heading="A new opportunity matches your preferences"
        paragraphs={[`${a.title} — ${a.providerName}.`]}
        action={{ label: "See the details", href: a.url }}
        footer={a.footer}
      />
    ),
  };
}

export function accountVerificationEmail(a: { verifyUrl: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Verify your 8Tasks account",
    react: (
      <SimpleEmail
        preview="Verify your email address"
        heading="Verify your email"
        paragraphs={["Confirm this address to finish setting up your 8Tasks account."]}
        action={{ label: "Verify email", href: a.verifyUrl }}
        afterAction={["Didn't create an account? You can ignore this email."]}
        footer={a.footer}
      />
    ),
  };
}

export function passwordResetEmail(a: { resetUrl: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Reset your 8Tasks password",
    react: (
      <SimpleEmail
        preview="Password reset requested"
        heading="Reset your password"
        paragraphs={["We received a request to reset your password. The link expires soon."]}
        action={{ label: "Choose a new password", href: a.resetUrl }}
        afterAction={[
          "If you didn't ask for this, ignore this email. Your password stays the same.",
        ]}
        footer={a.footer}
      />
    ),
  };
}

export function creatorPartnerWelcomeEmail(a: { portalUrl: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Welcome to the 8Tasks Creator Partner Program",
    react: (
      <SimpleEmail
        preview="Your partner account is ready"
        heading="Welcome, partner"
        paragraphs={[
          "Your Creator Partner account is approved. Participation is free.",
          "Commissions are based only on eligible, attributable revenue 8Tasks actually receives. Earnings are never guaranteed.",
        ]}
        action={{ label: "Open your partner portal", href: a.portalUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function promoAssetAnnouncementEmail(a: {
  assetTitle: string;
  libraryUrl: string;
  footer: FooterProps;
}): Built {
  return {
    stream: "promotional",
    subject: `New promotional asset: ${a.assetTitle}`,
    react: (
      <SimpleEmail
        preview={a.assetTitle}
        heading="New in your promotion library"
        paragraphs={[
          `${a.assetTitle} is ready to download. Please include the required disclosure when you post it.`,
        ]}
        action={{ label: "View the asset", href: a.libraryUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function commissionStatementEmail(a: {
  periodLabel: string;
  statementUrl: string;
  footer: FooterProps;
}): Built {
  // Figures are shown only on the statement page (from the ledger), never typed into email copy.
  return {
    stream: "transactional",
    subject: `Your 8Tasks partner statement for ${a.periodLabel}`,
    react: (
      <SimpleEmail
        preview={`Statement for ${a.periodLabel}`}
        heading={`Statement: ${a.periodLabel}`}
        paragraphs={[
          "Your partner statement is ready. Confirmed and pending amounts are shown separately on the statement page.",
        ]}
        action={{ label: "View statement", href: a.statementUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function adminProviderAlertEmail(a: {
  summary: string;
  adminUrl: string;
  footer: FooterProps;
}): Built {
  return {
    stream: "transactional",
    subject: `[8Tasks admin] ${a.summary}`,
    react: (
      <SimpleEmail
        preview={a.summary}
        heading="Provider needs review"
        paragraphs={[a.summary]}
        action={{ label: "Open admin", href: a.adminUrl }}
        footer={a.footer}
      />
    ),
  };
}

export function magicLinkEmail(a: { url: string; footer: FooterProps }): Built {
  return {
    stream: "transactional",
    subject: "Your 8Tasks sign-in link",
    react: (
      <SimpleEmail
        preview="Sign in to 8Tasks"
        heading="Sign in to 8Tasks"
        paragraphs={[
          "Use the button below to sign in. The link works once and expires in 15 minutes.",
          "Signing in never subscribes you to promotional emails, and 8Tasks is always free.",
        ]}
        action={{ label: "Sign in", href: a.url }}
        afterAction={["Didn't ask for this? Ignore this email and nothing will happen."]}
        footer={a.footer}
      />
    ),
  };
}
