import Link from "next/link";
import { FormMessage } from "@/components/admin/form-message";
import { ProviderForm } from "@/components/admin/provider-form";
import { requireAdminPage } from "@/lib/admin";
import { saveProvider } from "../../../actions";

export const metadata = { title: "Add provider" };

export default async function NewProviderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdminPage();
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/providers"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Providers
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add provider</h1>
      </div>
      <FormMessage error={sp.error} />
      <ProviderForm action={saveProvider.bind(null, null)} />
    </div>
  );
}
