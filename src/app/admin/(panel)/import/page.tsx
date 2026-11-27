import { requireAdminPage } from "@/lib/admin";
import { CSV_IMPORT_COLUMNS } from "@/lib/import/provider-import";
import { ImportClient } from "./import-client";

export const metadata = { title: "Import providers" };

export default async function ImportPage() {
  await requireAdminPage();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Import providers</h1>
        <p className="text-muted-foreground">
          Upload JSON (<code>{"{ providers: [{ slug, public, internal }] }"}</code>) or CSV. The
          founder&apos;s listings package (<code>listings_phase1.json</code> / <code>.csv</code>) is
          also accepted. Everything is validated and previewed first. New records are drafts;
          re-imports never change a status or admin notes you set here. Format:{" "}
          <code>docs/IMPORT_FORMAT.md</code>. Never upload <code>listings_pending_review.csv</code>.
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer">CSV columns</summary>
          <code className="mt-2 block break-all text-xs">{CSV_IMPORT_COLUMNS.join(",")}</code>
        </details>
      </div>
      <ImportClient />
    </div>
  );
}
