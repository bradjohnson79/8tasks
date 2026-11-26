import { asc, eq } from "drizzle-orm";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/admin/fields";
import { FormMessage } from "@/components/admin/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, discoveryGroups } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { DISCOVERY_ICONS } from "@/lib/discovery/icons";
import { saveGroup } from "../../discovery-actions";

export const metadata = { title: "Discovery" };

const ICON_OPTIONS = Object.keys(DISCOVERY_ICONS).map((k) => ({ value: k, label: k }));
const KIND_LABELS = {
  pathway: "Pathways (home “How do you want to earn?”)",
  subsection: "Subsections (/earn pages)",
  category_tab: "Category tabs",
} as const;

export default async function AdminDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const [groups, cats] = await Promise.all([
    db
      .select({ g: discoveryGroups, categoryName: categories.name })
      .from(discoveryGroups)
      .leftJoin(categories, eq(categories.id, discoveryGroups.categoryId))
      .orderBy(
        asc(discoveryGroups.kind),
        asc(categories.sortOrder),
        asc(discoveryGroups.sortOrder),
      ),
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Discovery</h1>
        <p className="text-muted-foreground">
          Pathways, category tabs and /earn subsections. A listing appears in a group when its
          category or subcategory (primary or secondary) is listed here, or when you add it to the
          group on the opportunity form. Categories without tabs show one tab per subcategory.
        </p>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />

      {(["pathway", "subsection", "category_tab"] as const).map((kind) => (
        <section key={kind} className="space-y-3">
          <h2 className="text-lg font-semibold">{KIND_LABELS[kind]}</h2>
          <ul className="space-y-3">
            {groups
              .filter((r) => r.g.kind === kind)
              .map(({ g, categoryName }) => (
                <li
                  key={g.id}
                  id={`g-${g.id}`}
                  className="scroll-mt-24 rounded-2xl border bg-card p-4"
                >
                  <details>
                    <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                      <span className="font-semibold">{g.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {categoryName ? `${categoryName} · ` : ""}
                        {g.slug}
                      </span>
                      {!g.isActive && <Badge variant="outline">Hidden</Badge>}
                    </summary>
                    <AdminForm
                      action={saveGroup.bind(null, g.id)}
                      className="mt-4 grid gap-4 sm:grid-cols-2"
                    >
                      <GroupFields idPrefix={g.id} g={g} />
                      <div>
                        <Button type="submit">Save</Button>
                      </div>
                    </AdminForm>
                  </details>
                </li>
              ))}
          </ul>
        </section>
      ))}

      <section className="space-y-3 rounded-2xl border border-dashed p-4">
        <h2 className="text-lg font-semibold">Add a group</h2>
        <AdminForm action={saveGroup.bind(null, null)} className="grid gap-4 sm:grid-cols-2">
          <SelectField
            idPrefix="new"
            name="kind"
            label="Kind"
            options={[
              { value: "subsection", label: "Subsection (/earn page)" },
              { value: "pathway", label: "Pathway" },
              { value: "category_tab", label: "Category tab" },
            ]}
          />
          <SelectField
            idPrefix="new"
            name="categoryId"
            label="Category (tabs only)"
            options={cats.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="—"
          />
          <TextField idPrefix="new" name="slug" label="Slug" required />
          <GroupFields idPrefix="new" />
          <div>
            <Button type="submit">Add group</Button>
          </div>
        </AdminForm>
      </section>
    </div>
  );
}

function GroupFields({
  idPrefix,
  g,
}: {
  idPrefix: string;
  g?: typeof discoveryGroups.$inferSelect;
}) {
  return (
    <>
      <TextField idPrefix={idPrefix} name="title" label="Title" defaultValue={g?.title} required />
      <TextField
        idPrefix={idPrefix}
        name="description"
        label="Description"
        defaultValue={g?.description}
      />
      <SelectField
        idPrefix={idPrefix}
        name="icon"
        label="Icon"
        defaultValue={g?.icon}
        options={ICON_OPTIONS}
        placeholder="—"
      />
      <TextField
        idPrefix={idPrefix}
        name="accent"
        label="Accent colour"
        defaultValue={g?.accent}
        placeholder="#53E6A0"
      />
      <div className="sm:col-span-2">
        <TextAreaField
          idPrefix={idPrefix}
          name="includes"
          label="Includes (one per line, shown on the page)"
          defaultValue={g?.includes.join("\n")}
          rows={3}
        />
      </div>
      <TextAreaField
        idPrefix={idPrefix}
        name="subcategorySlugs"
        label="Subcategory slugs"
        defaultValue={g?.subcategorySlugs.join("\n")}
        rows={4}
      />
      <TextAreaField
        idPrefix={idPrefix}
        name="categorySlugs"
        label="Whole category slugs"
        defaultValue={g?.categorySlugs.join("\n")}
        rows={4}
      />
      <TextField
        idPrefix={idPrefix}
        name="sortOrder"
        label="Sort order"
        type="number"
        defaultValue={String(g?.sortOrder ?? 0)}
      />
      <CheckboxField
        idPrefix={idPrefix}
        name="isActive"
        label="Shown on the site"
        defaultChecked={g?.isActive ?? true}
      />
    </>
  );
}
