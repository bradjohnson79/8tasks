import { count, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { SelectField, TextField } from "@/components/admin/fields";
import { FormMessage } from "@/components/admin/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  alertSubscriptions,
  listingReports,
  opportunities,
  providers,
  providerSubmissions,
} from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { REPORT_REASONS } from "@/lib/intake/schemas";
import { reviewIntake, unsubscribeSubscriber } from "../../discovery-actions";

export const metadata = { title: "Inbox" };

const STATUS = [
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
];
const fmt = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Vancouver",
});
const reason = (r: string) => REPORT_REASONS.find((x) => x.value === r)?.label ?? r;

/** Public reports and company submissions. Nothing here is published automatically. */
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const [reports, submissions, subs, [{ active }]] = await Promise.all([
    db
      .select({
        r: listingReports,
        opportunityTitle: opportunities.title,
        providerName: providers.name,
      })
      .from(listingReports)
      .leftJoin(opportunities, eq(opportunities.id, listingReports.opportunityId))
      .leftJoin(providers, eq(providers.id, listingReports.providerId))
      .orderBy(desc(listingReports.createdAt))
      .limit(100),
    db.select().from(providerSubmissions).orderBy(desc(providerSubmissions.createdAt)).limit(100),
    db.select().from(alertSubscriptions).orderBy(desc(alertSubscriptions.createdAt)).limit(200),
    db
      .select({ active: count() })
      .from(alertSubscriptions)
      .where(eq(alertSubscriptions.status, "active")),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
        <p className="text-muted-foreground">
          Listing reports and company submissions from the public site. Review by hand; nothing is
          published or unpublished automatically.
        </p>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Listing reports ({reports.filter((x) => x.r.status === "new").length} new)
        </h2>
        {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
        <ul className="space-y-3">
          {reports.map(({ r, opportunityTitle, providerName }) => (
            <li key={r.id} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={r.status === "new" ? "warning" : "outline"}>{r.status}</Badge>
                <span className="font-medium">{reason(r.reason)}</span>
                <span className="text-xs text-muted-foreground">{fmt.format(r.createdAt)}</span>
              </div>
              <p className="text-sm">
                {r.opportunityId ? (
                  <Link className="underline" href={`/admin/opportunities/${r.opportunityId}`}>
                    {opportunityTitle ?? "Opportunity"}
                  </Link>
                ) : r.providerId ? (
                  <Link className="underline" href={`/admin/providers/${r.providerId}`}>
                    {providerName ?? "Provider"}
                  </Link>
                ) : (
                  "Listing removed"
                )}
              </p>
              {r.details && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{r.details}</p>
              )}
              {r.contactEmail && <p className="text-xs">Reply to: {r.contactEmail}</p>}
              <AdminForm
                action={reviewIntake.bind(null, "report", r.id)}
                className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"
              >
                <SelectField
                  idPrefix={`r${r.id}`}
                  name="status"
                  label="Status"
                  defaultValue={r.status}
                  options={STATUS}
                />
                <TextField
                  idPrefix={`r${r.id}`}
                  name="adminNote"
                  label="Note"
                  defaultValue={r.adminNote}
                />
                <Button type="submit" variant="outline">
                  Update
                </Button>
              </AdminForm>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Company submissions ({submissions.filter((x) => x.status === "new").length} new)
        </h2>
        {submissions.length === 0 && (
          <p className="text-sm text-muted-foreground">No submissions yet.</p>
        )}
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li key={s.id} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={s.status === "new" ? "warning" : "outline"}>{s.status}</Badge>
                <span className="font-medium">{s.companyName}</span>
                <span className="text-xs text-muted-foreground">{fmt.format(s.createdAt)}</span>
              </div>
              {/* Untrusted text: shown as plain text, link not clickable. */}
              <p className="break-all text-sm text-muted-foreground">
                {s.websiteUrl} · {s.contactName ? `${s.contactName}, ` : ""}
                {s.contactEmail}
                {s.categorySlug ? ` · ${s.categorySlug}` : ""}
              </p>
              {s.notes && (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{s.notes}</p>
              )}
              <AdminForm
                action={reviewIntake.bind(null, "submission", s.id)}
                className="grid gap-3 sm:grid-cols-[160px_1fr_auto] sm:items-end"
              >
                <SelectField
                  idPrefix={`s${s.id}`}
                  name="status"
                  label="Status"
                  defaultValue={s.status}
                  options={STATUS}
                />
                <TextField
                  idPrefix={`s${s.id}`}
                  name="adminNote"
                  label="Note"
                  defaultValue={s.adminNote}
                />
                <Button type="submit" variant="outline">
                  Update
                </Button>
              </AdminForm>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Free alert subscribers ({active} active)</h2>
        <p className="text-sm text-muted-foreground">
          No alert emails are sent yet (needs an email service and founder approval). Consent
          wording and time are stored with each address.
        </p>
        {subs.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Categories</th>
                  <th className="p-3 font-medium">Frequency</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Since</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {subs.map((a) => (
                  <tr key={a.id} className="border-t">
                    <td className="p-3">{a.email}</td>
                    <td className="p-3">{a.categorySlugs.join(", ") || "All"}</td>
                    <td className="p-3">{a.frequency}</td>
                    <td className="p-3">{a.status}</td>
                    <td className="p-3">{fmt.format(a.consentedAt)}</td>
                    <td className="p-3">
                      {a.status === "active" && (
                        <AdminForm action={unsubscribeSubscriber.bind(null, a.id)}>
                          <Button type="submit" variant="outline" size="sm">
                            Unsubscribe
                          </Button>
                        </AdminForm>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
