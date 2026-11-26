import Link from "next/link";
import { FormMessage } from "@/components/admin/form-message";
import { ProgramForm } from "@/components/admin/program-form";
import { Badge } from "@/components/ui/badge";
import { listPrograms } from "@/lib/affiliates/queries";
import { requireAdminPage } from "@/lib/admin";
import { saveProgram } from "../../../earnings-actions";

export const metadata = { title: "Affiliate programs" };

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const programs = await listPrograms(db);
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/earnings"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Earnings
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Affiliate programs</h1>
        <p className="text-sm text-muted-foreground">
          Every program 8Tasks promotes or is applying to. One live tracking network per program, so
          nothing is counted twice.
        </p>
      </div>
      <FormMessage saved={sp.saved} />
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="px-3 py-3 font-medium">Program</th>
              <th className="px-3 py-3 font-medium">Network</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Payout method</th>
              <th className="px-3 py-3 font-medium">Currency</th>
              <th className="px-3 py-3 font-medium">Data method</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {programs.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/earnings/programs/${p.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{p.id}</div>
                </td>
                <td className="px-3 py-2">
                  {p.network}
                  {p.networkCampaignId ? ` · ${p.networkCampaignId}` : ""}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={p.status === "live" ? "default" : "outline"}>
                    {p.status.replace(/_/g, " ")}
                  </Badge>
                </td>
                <td className="px-3 py-2">{p.payoutMethod ?? "—"}</td>
                <td className="px-3 py-2">{p.currencyDefault ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.dataMethod ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Add a program</h2>
        <ProgramForm action={saveProgram.bind(null, null)} />
      </section>
    </div>
  );
}
