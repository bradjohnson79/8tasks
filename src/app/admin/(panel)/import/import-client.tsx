"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { applyImport, previewImport, type ImportState } from "../../import-actions";

/** Two steps: preview the diff, then apply the exact same data. */
export function ImportClient() {
  const [preview, runPreview, previewing] = useActionState<ImportState, FormData>(
    previewImport,
    undefined,
  );
  const [applied, runApply, applying] = useActionState<ImportState, FormData>(
    applyImport,
    undefined,
  );
  const state = applied ?? preview;

  if (applied?.stage === "done")
    return (
      <p role="status" className="rounded-xl border border-emerald-600/40 p-4 text-sm">
        {applied.message}{" "}
        <Link href="/admin/providers" className="underline">
          Go to providers
        </Link>
      </p>
    );

  return (
    <div className="space-y-6">
      <form action={runPreview} className="space-y-4 rounded-2xl border bg-card p-4">
        <fieldset className="flex gap-4 text-sm">
          <legend className="mb-2 text-sm font-medium">Format</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="format" value="json" defaultChecked /> JSON
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="format" value="csv" /> CSV
          </label>
        </fieldset>
        <label className="block text-sm">
          <span className="font-medium">File</span>
          <input
            type="file"
            name="file"
            accept=".json,.csv,application/json,text/csv"
            className="mt-1 block"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">…or paste</span>
          <textarea
            name="raw"
            rows={8}
            className="mt-1 w-full rounded-xl border bg-background p-2 font-mono text-xs"
          />
        </label>
        <fieldset className="space-y-2 text-sm">
          <legend className="mb-1 font-medium">Listings package options</legend>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="includeFree" /> Include free listing candidates (always
            imported as drafts)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="publishAffiliate" /> Publish the affiliate listings marked
            published, even if they already exist (founder go-ahead)
          </label>
        </fieldset>
        <Button type="submit" disabled={previewing}>
          {previewing ? "Checking…" : "Preview import"}
        </Button>
      </form>

      {state?.stage === "error" && (
        <div role="alert" className="rounded-xl border border-red-400/50 p-4 text-sm">
          <p className="font-medium">Nothing imported. Fix these and try again:</p>
          <ul className="mt-2 list-disc pl-5">
            {state.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {preview?.stage === "preview" && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Preview</h2>
          <ul className="space-y-2">
            {preview.rows.map((r) => (
              <li key={r.slug} className="rounded-xl border p-3 text-sm">
                <p className="font-medium">
                  {r.action === "create" ? "New" : "Update"}: {r.name}{" "}
                  <span className="text-muted-foreground">({r.slug})</span>
                </p>
                <p>
                  {r.listingType === "free"
                    ? "Free listing (no commission). "
                    : r.listingType === "affiliate"
                      ? "Affiliate listing. "
                      : ""}
                  Status after import: {r.statusAfter}. Admin notes you edited are kept.
                </p>
                {r.changes.length > 0 && <p>Changes: {r.changes.join(", ")}</p>}
                {r.newAffiliateLink && <p>Adds an affiliate link (stored admin-only).</p>}
                {r.opportunities.length > 0 && (
                  <p>
                    Opportunities:{" "}
                    {r.opportunities.map((o) => `${o.title} (${o.action})`).join("; ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
          <form action={runApply}>
            <input type="hidden" name="raw" value={preview.raw} />
            <input type="hidden" name="format" value={preview.format} />
            {preview.includeFree && <input type="hidden" name="includeFree" value="on" />}
            {preview.publishAffiliate && <input type="hidden" name="publishAffiliate" value="on" />}
            <Button type="submit" disabled={applying}>
              {applying ? "Importing…" : `Import ${preview.rows.length} providers`}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
