import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { FormMessage } from "@/components/admin/form-message";
import { OpportunityForm } from "@/components/admin/opportunity-form";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { getOpportunityFormOptions } from "@/db/queries/admin";
import { opportunities } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { saveOpportunity } from "../../../actions";

export const metadata = { title: "Edit opportunity" };

export default async function EditOpportunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [opportunity] = await db.select().from(opportunities).where(eq(opportunities.id, id));
  if (!opportunity) notFound();
  const options = await getOpportunityFormOptions(db);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/admin/opportunities"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Opportunities
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{opportunity.title}</h1>
          <StatusBadge status={opportunity.status} />
          {opportunity.isDemo && <Badge variant="warning">Demo</Badge>}
        </div>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />
      <OpportunityForm
        action={saveOpportunity.bind(null, opportunity.id)}
        opportunity={opportunity}
        options={options}
      />
    </div>
  );
}
