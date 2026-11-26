import Link from "next/link";
import { FormMessage } from "@/components/admin/form-message";
import { OpportunityForm } from "@/components/admin/opportunity-form";
import { getOpportunityFormOptions } from "@/db/queries/admin";
import { requireAdminPage } from "@/lib/admin";
import { saveOpportunity } from "../../../actions";

export const metadata = { title: "Add opportunity" };

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; providerId?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const options = await getOpportunityFormOptions(db);
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/opportunities"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Opportunities
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add opportunity</h1>
      </div>
      <FormMessage error={sp.error} />
      <OpportunityForm
        action={saveOpportunity.bind(null, null)}
        options={options}
        defaultProviderId={sp.providerId}
      />
    </div>
  );
}
