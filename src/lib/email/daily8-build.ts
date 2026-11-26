import "server-only";
import { createElement } from "react";
import { getDiscoveryConfig } from "@/lib/discovery/config";
import { formatCompensation } from "@/lib/missions/compensation";
import type { Opportunity } from "@/lib/missions/types";
import { emailConfig, siteOrigin } from "./config";
import { daily8Intro, recommendDaily8, type SubscriberPrefs } from "./daily8";
import Daily8Email from "./templates/daily8";
import type { FooterProps } from "./templates/layout";

export type SettingsLike = { senderName: string; postalAddress: string | null };

export function promoFooter(settings: SettingsLike, token?: string): FooterProps {
  const site = siteOrigin();
  return {
    kind: "promotional",
    senderName: settings.senderName,
    postalAddress: settings.postalAddress,
    siteUrl: site,
    preferencesUrl: token ? `${site}/email/preferences?token=${token}` : `${site}/daily-8`,
    unsubscribeUrl: token ? `${site}/email/unsubscribe?token=${token}` : undefined,
  };
}

/**
 * Builds a My Daily 8 / Weekly 8 email. Buttons go to 8Tasks pages via /e/<send>/<id>, which
 * logs the click and redirects internally; affiliate links are only ever used from the site
 * (/go), so no tracking parameters are added to provider URLs.
 */
export async function buildDaily8(a: {
  variant: "daily" | "weekly";
  prefs: SubscriberPrefs;
  candidates: Opportunity[];
  recentlySent: string[];
  lastSent: string[];
  sendId: string;
  token?: string;
  settings: SettingsLike;
  now?: Date;
}) {
  const { subsections } = await getDiscoveryConfig();
  const rec = recommendDaily8(a.prefs, a.candidates, {
    subsections,
    recentlySent: a.recentlySent,
    lastSent: a.lastSent,
    now: a.now,
  });
  if (!rec.send) return rec;
  const site = siteOrigin();
  const campaign = a.variant === "daily" ? "daily8" : "weekly8";
  const items = rec.items.map((o) => {
    const pay = formatCompensation(o.compensation);
    return {
      title: o.title,
      providerName: o.providerName,
      categoryName: o.categoryName,
      kindLabel: o.kind === "mission" ? "Specific mission" : "Provider opportunity",
      payText: pay.isAmount ? `${pay.primary}${pay.unit ? ` ${pay.unit}` : ""}` : pay.primary,
      payIsCash: pay.isAmount,
      url: `${site}/e/${a.sendId}/${o.id}`,
    };
  });
  const subject =
    a.variant === "daily"
      ? `My Daily 8: ${items.length} ${items.length === 1 ? "opportunity" : "opportunities"} for you`
      : `My Weekly 8: ${items.length} ${items.length === 1 ? "opportunity" : "opportunities"} for you`;
  const react = createElement(Daily8Email, {
    variant: a.variant,
    intro: daily8Intro(items.length, a.variant),
    items,
    siteUrl: site,
    discoverUrl: `${site}/missions?utm_source=email&utm_medium=email&utm_campaign=${campaign}`,
    footer: promoFooter(a.settings, a.token),
  });
  return {
    send: true as const,
    subject,
    react,
    itemIds: rec.items.map((o) => o.id),
    from: emailConfig().from.daily8,
    unsubscribeUrl: a.token ? `${site}/api/email/unsubscribe?token=${a.token}` : undefined,
  };
}
