import { randomUUID } from "node:crypto";
import { desc, eq, gte, sql } from "drizzle-orm";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, SelectField, TextField } from "@/components/admin/fields";
import { FormMessage } from "@/components/admin/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  emailEvents,
  emailSends,
  emailSettings,
  emailSubscribers,
  emailSuppressions,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { emailConfig } from "@/lib/email/config";
import { buildDaily8 } from "@/lib/email/daily8-build";
import { renderEmail } from "@/lib/email/deliver";
import { loadOpportunities } from "@/lib/missions/source";
import {
  adminUnsubscribe,
  removeSuppression,
  runEmailNow,
  saveEmailSettings,
  sendTestEmail,
} from "../../email-actions";

export const metadata = { title: "Email" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Vancouver",
});
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; preview?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const since = new Date(Date.now() - 30 * 86_400_000);
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [[settings], subCounts, sendCounts, eventCounts, [month], subs, sends, suppressions] =
    await Promise.all([
      db.select().from(emailSettings).where(eq(emailSettings.id, 1)),
      db
        .select({
          status: emailSubscribers.status,
          frequency: emailSubscribers.frequency,
          n: sql<number>`count(*)::int`,
        })
        .from(emailSubscribers)
        .groupBy(emailSubscribers.status, emailSubscribers.frequency),
      db
        .select({
          status: emailSends.status,
          campaign: emailSends.campaign,
          n: sql<number>`count(*)::int`,
        })
        .from(emailSends)
        .where(gte(emailSends.createdAt, since))
        .groupBy(emailSends.status, emailSends.campaign),
      db
        .select({ type: emailEvents.type, n: sql<number>`count(*)::int` })
        .from(emailEvents)
        .where(gte(emailEvents.createdAt, since))
        .groupBy(emailEvents.type),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(emailSends)
        .where(
          sql`${emailSends.status} = 'sent' and ${emailSends.sentAt} >= ${monthStart.toISOString()}`,
        ),
      db.select().from(emailSubscribers).orderBy(desc(emailSubscribers.createdAt)).limit(100),
      db.select().from(emailSends).orderBy(desc(emailSends.createdAt)).limit(30),
      db.select().from(emailSuppressions).orderBy(desc(emailSuppressions.createdAt)).limit(50),
    ]);

  const cfg = emailConfig();
  const count = (f: (r: (typeof subCounts)[number]) => boolean) =>
    subCounts.filter(f).reduce((a, r) => a + r.n, 0);
  const active = count((r) => r.status === "active");
  const daily = count((r) => r.status === "active" && r.frequency === "daily");
  const weekly = count((r) => r.status === "active" && r.frequency === "weekly");
  const alerts = count((r) => r.status === "active" && r.frequency === "alerts");
  const websiteOnly = count((r) => r.status === "active" && r.frequency === "website_only");
  const sent30 = sendCounts.filter((r) => r.status === "sent").reduce((a, r) => a + r.n, 0);
  const ev = (t: string) => eventCounts.find((e) => e.type === t)?.n ?? 0;
  const clicks = ev("click");
  const projected = Math.round(daily * 30 + weekly * 4.35);
  const quota = settings.planMonthlyQuota;
  const overQuota = projected > quota;
  const usagePct = settings.monthlyLimit ? Math.round((month.n / settings.monthlyLimit) * 100) : 0;
  const liveBlockers = [
    !cfg.automatedEnabled && 'EMAIL_SENDING_ENABLED is not "true"',
    !cfg.apiKey && "RESEND_API_KEY is not set",
    !settings.postalAddress && "sender postal address is empty",
    settings.sendingPaused && "sending is paused",
  ].filter(Boolean) as string[];

  // Preview: a sample (no preferences) or a specific subscriber's preferences.
  let previewHtml: string | null = null;
  let previewNote: string | null = null;
  if (sp.preview) {
    const sub = /^[0-9a-f-]{36}$/.test(sp.preview)
      ? (await db.select().from(emailSubscribers).where(eq(emailSubscribers.id, sp.preview)))[0]
      : undefined;
    const built = await buildDaily8({
      variant: sub?.frequency === "weekly" ? "weekly" : "daily",
      prefs: sub ?? {
        categories: [],
        creativeInterests: [],
        workMode: "any",
        beginnerOnly: false,
        equipment: [],
        compensationTypes: [],
      },
      candidates: (await loadOpportunities()).filter((o) => !o.isDemo),
      recentlySent: [],
      lastSent: [],
      sendId: randomUUID(),
      token: sub?.token,
      settings,
    });
    if (built.send) previewHtml = (await renderEmail(built.react)).html;
    else
      previewNote =
        built.reason === "no_matches"
          ? "Nothing to send: no published, non-demo listings match (providers must allow email traffic). The email would be skipped."
          : "Nothing new since the last email: it would be skipped.";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email (My Daily 8)</h1>
        <p className="text-muted-foreground">
          Free, opt-in email. Double opt-in, one-click unsubscribe, bounce/complaint suppression.
        </p>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />

      <section
        className={`rounded-2xl border p-4 text-sm ${liveBlockers.length ? "border-amber-500/50" : "border-emerald-600/50"}`}
      >
        <p className="font-semibold">
          Automated sending: {liveBlockers.length ? "OFF (dry run or paused)" : "LIVE"}
        </p>
        {liveBlockers.length > 0 && (
          <p className="text-muted-foreground">Because: {liveBlockers.join("; ")}.</p>
        )}
        <p className="mt-1 text-muted-foreground">
          Resend key: {cfg.apiKey ? "configured" : "missing"} · Webhook secret:{" "}
          {cfg.webhookSecret ? "configured" : "missing"} · Webhook URL: /api/email/webhooks/resend
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Active subscribers" value={active} />
        <Stat label="Daily / weekly" value={`${daily} / ${weekly}`} />
        <Stat label="Alerts only / website only" value={`${alerts} / ${websiteOnly}`} />
        <Stat label="Pending confirmation" value={count((r) => r.status === "pending")} />
        <Stat label="Unsubscribed" value={count((r) => r.status === "unsubscribed")} />
        <Stat
          label="Bounced / complained"
          value={`${count((r) => r.status === "bounced")} / ${count((r) => r.status === "complained")}`}
        />
        <Stat label="Sent (30 days)" value={sent30} hint={`${month.n} this month`} />
        <Stat
          label="Daily 8 click-through"
          value={sent30 ? `${Math.round((clicks / sent30) * 100)}%` : "—"}
          hint={`${clicks} clicks (our own redirect, reliable)`}
        />
        <Stat label="Delivered (webhook)" value={ev("email.delivered")} />
        <Stat
          label="Bounces / complaints"
          value={`${ev("email.bounced")} / ${ev("email.complained")}`}
        />
        <Stat
          label="Opens (unreliable)"
          value={ev("email.opened")}
          hint="Image-based; privacy features inflate or hide opens"
        />
        <Stat
          label="Projected monthly volume"
          value={projected}
          hint={`${settings.planName}: ${quota} included, $${settings.planMonthlyCostUsd}/mo${overQuota ? " — OVER QUOTA" : ""}`}
        />
      </section>
      {(overQuota || usagePct >= settings.alertThresholdPct) && (
        <p role="alert" className="rounded-xl border border-amber-500/50 p-3 text-sm">
          Volume warning: {usagePct}% of the monthly limit used; projected {projected} vs plan quota{" "}
          {quota}. Plans are never upgraded automatically.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Affiliate conversions from email aren&apos;t attributed yet: networks report by click ID,
        and email clicks go through 8Tasks pages first. Plan quota and price are entered by you from
        the Resend dashboard; verify them there.
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Controls</h2>
        <AdminForm
          action={saveEmailSettings}
          className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-3"
        >
          <CheckboxField
            name="sendingPaused"
            label="Pause all automated sending"
            defaultChecked={settings.sendingPaused}
          />
          <CheckboxField
            name="campaign_daily8"
            label="My Daily 8"
            defaultChecked={settings.campaigns.daily8 !== false}
          />
          <CheckboxField
            name="campaign_weekly8"
            label="My Weekly 8"
            defaultChecked={settings.campaigns.weekly8 !== false}
          />
          <CheckboxField
            name="campaign_alerts"
            label="Matching alerts (Phase 3)"
            defaultChecked={!!settings.campaigns.alerts}
          />
          <CheckboxField
            name="campaign_confirm"
            label="Confirmation emails"
            defaultChecked={settings.campaigns.confirm !== false}
          />
          <div />
          <TextField
            name="dailyLimit"
            label="Daily limit"
            type="number"
            defaultValue={String(settings.dailyLimit)}
          />
          <TextField
            name="monthlyLimit"
            label="Monthly limit"
            type="number"
            defaultValue={String(settings.monthlyLimit)}
          />
          <TextField
            name="batchSize"
            label="Max per hourly run"
            type="number"
            defaultValue={String(settings.batchSize)}
          />
          <SelectField
            name="weeklyDay"
            label="Weekly 8 day"
            defaultValue={String(settings.weeklyDay)}
            options={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
          />
          <TextField name="planName" label="Resend plan" defaultValue={settings.planName} />
          <TextField
            name="planMonthlyQuota"
            label="Plan emails / month"
            type="number"
            defaultValue={String(settings.planMonthlyQuota)}
          />
          <TextField
            name="planMonthlyCostUsd"
            label="Plan cost (USD / month)"
            defaultValue={settings.planMonthlyCostUsd}
          />
          <TextField
            name="alertThresholdPct"
            label="Warn at % of monthly limit"
            type="number"
            defaultValue={String(settings.alertThresholdPct)}
          />
          <TextField name="senderName" label="Sender name" defaultValue={settings.senderName} />
          <TextField
            name="postalAddress"
            label="Sender postal address (required)"
            defaultValue={settings.postalAddress}
          />
          <TextField name="replyTo" label="Reply-to address" defaultValue={settings.replyTo} />
          <div className="sm:col-span-3">
            <Button type="submit">Save email settings</Button>
          </div>
        </AdminForm>
        <div className="flex flex-wrap gap-3">
          <AdminForm
            action={sendTestEmail}
            className="flex flex-wrap items-end gap-3 rounded-2xl border bg-card p-4"
          >
            <TextField name="to" label="Send test email to" type="email" required idPrefix="test" />
            <SelectField
              idPrefix="test"
              name="template"
              label="Template"
              options={[
                { value: "daily8", label: "My Daily 8 (sample)" },
                { value: "confirm", label: "Confirm subscription" },
                { value: "welcome", label: "Welcome" },
              ]}
            />
            <Button type="submit" variant="outline">
              Send test
            </Button>
          </AdminForm>
          <AdminForm action={runEmailNow} className="flex items-end rounded-2xl border bg-card p-4">
            <Button type="submit" variant="outline">
              Run scheduler now
            </Button>
          </AdminForm>
          <a
            href="/admin/email?preview=sample#preview"
            className="self-end rounded-xl border px-4 py-2 text-sm"
          >
            Preview Daily 8 (sample)
          </a>
        </div>
      </section>

      {(previewHtml || previewNote) && (
        <section id="preview" className="space-y-2">
          <h2 className="text-lg font-semibold">Preview</h2>
          {previewNote && <p className="text-sm text-muted-foreground">{previewNote}</p>}
          {previewHtml && (
            <iframe
              title="Daily 8 preview"
              sandbox=""
              srcDoc={previewHtml}
              className="h-[900px] w-full max-w-[640px] rounded-xl border bg-white"
            />
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Subscribers (latest 100)</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Frequency</th>
                <th className="p-3 font-medium">Where / time zone</th>
                <th className="p-3 font-medium">Consent</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-t align-top">
                  <td className="p-3">{s.email}</td>
                  <td className="p-3">
                    <Badge variant={s.status === "active" ? "default" : "outline"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="p-3">{s.frequency}</td>
                  <td className="p-3">
                    {[s.city, s.region, s.country].filter(Boolean).join(", ") || "CA/US"} ·{" "}
                    {s.timeZone}
                  </td>
                  <td className="p-3 text-xs">
                    {fmt.format(s.consentedAt)} · {s.consentSource} · {s.consentVersion}
                    {s.confirmedAt
                      ? ` · confirmed ${fmt.format(s.confirmedAt)}`
                      : " · not confirmed"}
                  </td>
                  <td className="space-x-2 p-3 whitespace-nowrap">
                    <a className="underline" href={`/admin/email?preview=${s.id}#preview`}>
                      Preview
                    </a>
                    {(s.status === "active" || s.status === "pending") && (
                      <AdminForm action={adminUnsubscribe.bind(null, s.id)} className="inline">
                        <Button type="submit" variant="outline" size="sm">
                          Unsubscribe
                        </Button>
                      </AdminForm>
                    )}
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr>
                  <td className="p-3 text-muted-foreground" colSpan={6}>
                    No subscribers yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent sends</h2>
        <ul className="space-y-1 text-sm">
          {sends.map((s) => (
            <li key={s.id} className="flex flex-wrap gap-2">
              <Badge variant="outline">{s.status}</Badge>
              <span>{s.campaign}</span>
              <span className="text-muted-foreground">
                {s.email} · {fmt.format(s.createdAt)} · {s.items.length} items
                {s.error ? ` · ${s.error}` : ""}
              </span>
            </li>
          ))}
          {sends.length === 0 && <li className="text-muted-foreground">Nothing sent yet.</li>}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Suppression list</h2>
        <ul className="space-y-1 text-sm">
          {suppressions.map((s) => (
            <li key={s.email} className="flex items-center gap-2">
              {s.email} <Badge variant="outline">{s.reason}</Badge>
              <AdminForm action={removeSuppression.bind(null, s.email)} className="inline">
                <Button type="submit" variant="outline" size="sm">
                  Remove
                </Button>
              </AdminForm>
            </li>
          ))}
          {suppressions.length === 0 && <li className="text-muted-foreground">Empty.</li>}
        </ul>
      </section>
    </div>
  );
}
