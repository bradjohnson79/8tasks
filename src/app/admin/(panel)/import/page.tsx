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
          Upload JSON (<code>{"{ providers: [{ slug, public, internal }] }"}</code>) or CSV.
          Everything is validated, shown as a preview, and imported as <strong>draft</strong>.
          Publishing stays a manual step. Format: <code>docs/IMPORT_FORMAT.md</code>.
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
