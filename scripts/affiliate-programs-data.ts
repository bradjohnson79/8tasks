/**
 * Affiliate program registry seed — from the founder's earnings_feed_sources.csv research
 * (25 Nov 2026) and site link map change list. Real business data, safe for production.
 * Inserted only if missing (ON CONFLICT DO NOTHING) so admin edits are never overwritten.
 * Unknown facts stay null: never guess payout methods, currencies or campaign ids.
 */
export type ProgramSeed = {
  id: string;
  name: string;
  network: string;
  status: "live" | "pending_signup" | "waiting_for_site" | "paused" | "not_in_scope";
  dataMethod: string;
  docsUrl?: string;
  networkCampaignId?: string;
  payoutMethod?: string;
  currencyDefault?: string;
  affiliateUrl?: string;
  notes?: string;
};

export const AFFILIATE_PROGRAM_SEED: ProgramSeed[] = [
  // Live today
  {
    id: "dreamstime",
    name: "Dreamstime",
    network: "direct",
    status: "live",
    dataMethod: "dashboard + email_notifications + manual_or_csv",
    docsUrl: "https://www.dreamstime.com/affiliate-referral-program",
    affiliateUrl: "https://www.dreamstime.com/#res62198923",
    notes:
      "No public affiliate reporting API (the Dreamstime API is a stock-media API). 10% of referred buyers' and contributors' transactions, 3 years, 30-day cookie. Payout minimum/methods unverified (payment FAQ returned 403).",
  },
  {
    id: "joinbrands",
    name: "JoinBrands",
    network: "direct",
    status: "live",
    dataMethod: "dashboard_wallet + manual_or_csv",
    docsUrl: "https://help.joinbrands.com/en/articles/7910946-creators-affiliate-program",
    payoutMethod: "PayPal",
    currencyDefault: "USD",
    affiliateUrl: "https://joinbrands.com/?ref=ccIo2N",
    notes:
      "Wallet holds commissions; added 60 days after JoinBrands is paid. US$30 per referred brand; US$5 per active referred creator; 20% of service fees from referred brands for 1 year. PayPal only (connected). CSV export unverified.",
  },

  // Networks (one connector each covers every approved program in the account)
  { id: "impact", name: "Impact (partner account)", network: "impact", status: "waiting_for_site", dataMethod: "reporting_api + event_notifications_webhooks + scheduled_dashboard_reports", docsUrl: "https://integrations.impact.com/partner-api-reference/", notes: "Group B: waits for live 8tasks.com. Read-only Partner token. Actions (45-day window), Invoices, Event Notifications." },
  { id: "awin", name: "Awin (publisher account)", network: "awin", status: "waiting_for_site", dataMethod: "reporting_api + dashboard_reports", docsUrl: "https://help.awin.com/apidocs/api-authentication", notes: "Group B. Transactions (31-day window), advertiser report (region required). No publisher payments API found." },
  { id: "cj", name: "CJ Affiliate (publisher account)", network: "cj", status: "waiting_for_site", dataMethod: "reporting_api", docsUrl: "https://lab-developers.d.cjpowered.com/graphql/reference/Commission%20Detail", notes: "Group B. publisherCommissions GraphQL (31-day window). Payments API not found (unverified)." },
  { id: "flexoffers", name: "FlexOffers (publisher account)", network: "flexoffers", status: "waiting_for_site", dataMethod: "reporting_api + postback + dashboard_csv", docsUrl: "https://www.flexoffers.com/publishers/web-service-api/", notes: "Group B; free plan planned. /allsales per status; /payments/summary. Do not pay for a plan without Brad's approval." },
  { id: "daisycon", name: "Daisycon (publisher account)", network: "daisycon", status: "waiting_for_site", dataMethod: "reporting_api + scheduled_url_exports + webhooks", docsUrl: "https://daisycon.com/en/developers/api/", notes: "Group B. OAuth 2.1 + PKCE; single-use refresh tokens. 50 req/min/IP." },
  { id: "maxbounty", name: "MaxBounty (publisher account)", network: "maxbounty", status: "pending_signup", dataMethod: "postback + dashboard_manual_or_csv", docsUrl: "https://maxbounty.com/faq-screen/", currencyDefault: "USD", notes: "Group A (needs Brad: phone interview + ID). No official API; postback with s2 click id; tokens unverified until in-account. Payoneer/Tipalti, USD 100 minimum." },
  { id: "offerjuice", name: "OfferJuice (Dynata)", network: "offerjuice", status: "waiting_for_site", dataMethod: "dashboard_or_partner_reports_after_acceptance", docsUrl: "https://www.offerjuice.com/global-strategic-partnerships.html", notes: "Do not contact until Brad approves and 8tasks.com is live. Reporting/postbacks provided after acceptance (unverified)." },

  // Direct programs
  { id: "pond5", name: "Pond5 (contributor referral)", network: "direct", status: "pending_signup", dataMethod: "dashboard + csv_export + email_notifications", docsUrl: "https://contributor.pond5.com/getting-started/referral-program/", currencyDefault: "USD", notes: "Waiting on Brad's ID check. CSV of referral transactions under Dashboard → Financials (map columns once a sample exists). Paid on the 15th when ≥ USD 25." },
  { id: "slicethepie", name: "Slicethepie (refer-a-friend)", network: "direct", status: "paused", dataMethod: "dashboard_manual_or_csv", docsUrl: "https://www.slicethepie.com/refer-a-friend", notes: "Site in maintenance during research; terms and payment methods unverified." },
  { id: "pawns-app", name: "Pawns.app (partner program)", network: "direct", status: "pending_signup", dataMethod: "dashboard (direct) + Impact reporting_api if approved", docsUrl: "https://pawns.app/partners/", notes: "Direct account can be created now. If the IPRoyal Impact application is approved, map that campaign here and avoid double counting." },
  { id: "user-interviews", name: "User Interviews", network: "direct", status: "waiting_for_site", dataMethod: "scheduled_email_report + invoice (manual entry)", docsUrl: "https://www.userinterviews.com/user-interviews-affiliates", notes: "Monthly report → invoice → payment. Payout method unverified. Email only with Brad's approval." },
  { id: "branded-surveys", name: "Branded Surveys", network: "undecided", status: "waiting_for_site", dataMethod: "direct_dashboard + network APIs/postbacks", docsUrl: "https://surveys.gobranded.com/affiliate/", notes: "Direct IO, Impact or MaxBounty: pick one path (MaxBounty first per signup plan). Never double count." },

  // Programs reached through networks
  { id: "panelplace", name: "PanelPlace", network: "awin", status: "waiting_for_site", networkCampaignId: "87963", dataMethod: "covered_by_network_api (Awin)", docsUrl: "https://www.panelplace.com/affiliate", notes: "Awin CID 87963. Consumer incentives prohibited." },
  { id: "freecash", name: "Freecash", network: "impact", status: "waiting_for_site", dataMethod: "covered_by_network_api (Impact)" },
  { id: "swagbucks", name: "Swagbucks (Prodege)", network: "impact", status: "waiting_for_site", dataMethod: "covered_by_network_api (Impact and/or MaxBounty postback)", notes: "Prefer Impact if both approved; MaxBounty as fallback. One network per user action." },
  { id: "ipsos-isay", name: "Ipsos iSay", network: "impact", status: "waiting_for_site", dataMethod: "covered_by_network_api (Impact)" },
  { id: "survey-junkie", name: "Survey Junkie", network: "undecided", status: "waiting_for_site", dataMethod: "covered_by_network_api (chosen network)", notes: "Listed on Impact, MaxBounty, Awin, LinkConnector. Pick one primary network." },
  { id: "pinecone-research", name: "Pinecone Research (NielsenIQ)", network: "maxbounty", status: "pending_signup", dataMethod: "covered_by_network_api (MaxBounty postback)", notes: "Wait for MaxBounty approval, then apply in-network." },
  { id: "yoursurveys", name: "YourSurveys (Cint)", network: "flexoffers", status: "waiting_for_site", dataMethod: "covered_by_network_api (FlexOffers)" },
  { id: "valued-opinions", name: "Valued Opinions", network: "undecided", status: "waiting_for_site", dataMethod: "covered_by_network_api (chosen official path)", notes: "Daisycon, OfferJuice or MaxBounty. Never double count across paths." },
  { id: "opinion-outpost", name: "Opinion Outpost", network: "offerjuice", status: "waiting_for_site", dataMethod: "covered_by_network_api (OfferJuice after acceptance)" },
  { id: "maxbounty-referral", name: "MaxBounty affiliate referral", network: "maxbounty", status: "pending_signup", dataMethod: "covered_by_network_api (MaxBounty dashboard/postback)", notes: "Separate row: referral-of-affiliates vs offer CPA." },

  // FOUNDER REVIEW: not in scope until approved
  { id: "mypoints", name: "MyPoints (Prodege)", network: "undecided", status: "not_in_scope", dataMethod: "covered_by_network_api if later approved", notes: "FOUNDER REVIEW" },
  { id: "flexoffers-flexcash", name: "FlexOffers FlexCash", network: "flexoffers", status: "not_in_scope", dataMethod: "covered_by_network_api (FlexOffers)", notes: "FOUNDER REVIEW" },
  { id: "nielseniq-homescan", name: "NielsenIQ Homescan", network: "maxbounty", status: "not_in_scope", dataMethod: "covered_by_network_api (MaxBounty)", notes: "FOUNDER REVIEW" },
  { id: "mobile-xpression", name: "Mobile Xpression", network: "maxbounty", status: "not_in_scope", dataMethod: "covered_by_network_api (MaxBounty)", notes: "FOUNDER REVIEW" },
  { id: "prime-opinion", name: "Prime Opinion", network: "flexoffers", status: "not_in_scope", dataMethod: "covered_by_network_api (FlexOffers if used)", notes: "FOUNDER REVIEW" },
  { id: "yougov", name: "YouGov", network: "undecided", status: "not_in_scope", dataMethod: "covered_by_network_api (chosen network)", notes: "FOUNDER REVIEW" },
];
