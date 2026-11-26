import { asc } from "drizzle-orm";
import { AdminForm } from "@/components/admin/admin-form";
import { CheckboxField, SelectField, TextField } from "@/components/admin/fields";
import { FormMessage } from "@/components/admin/form-message";
import { CategoryIcon, ICONS } from "@/components/app/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories, subcategories } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";
import { addSubcategory, saveCategory, toggleSubcategory } from "../../actions";

export const metadata = { title: "Categories" };

const ICON_OPTIONS = Object.keys(ICONS).map((k) => ({ value: k, label: k }));

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { db } = await requireAdminPage();
  const sp = await searchParams;
  const [cats, subs] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select().from(subcategories).orderBy(asc(subcategories.sortOrder), asc(subcategories.name)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">
          The 8 mission categories. Edit names, descriptions, icons and order; hide a category to
          remove it from the site.
        </p>
      </div>
      <FormMessage saved={sp.saved} error={sp.error} />
      <ul className="space-y-4">
        {cats.map((c) => (
          <li key={c.id} className="space-y-4 rounded-2xl border bg-card p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <CategoryIcon name={c.icon} className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">{c.name}</h2>
                <p className="text-xs text-muted-foreground">/categories/{c.slug}</p>
              </div>
              {!c.isActive && <Badge variant="outline">Hidden</Badge>}
            </div>
            <AdminForm
              action={saveCategory.bind(null, c.id)}
              className="grid gap-4 sm:grid-cols-[2fr_3fr_1fr_1fr]"
            >
              <TextField
                idPrefix={`c-${c.id}`}
                name="name"
                label="Name"
                defaultValue={c.name}
                required
              />
              <TextField
                idPrefix={`c-${c.id}`}
                name="description"
                label="Description"
                defaultValue={c.description}
              />
              <SelectField name="icon" label="Icon" defaultValue={c.icon} options={ICON_OPTIONS} />
              <TextField
                idPrefix={`c-${c.id}`}
                name="sortOrder"
                label="Order"
                type="number"
                defaultValue={String(c.sortOrder)}
              />
              <div className="flex items-center justify-between gap-3 sm:col-span-4">
                <CheckboxField
                  idPrefix={`c-${c.id}`}
                  name="isActive"
                  label="Visible on site"
                  defaultChecked={c.isActive}
                />
                <Button type="submit" variant="outline" size="sm">
                  Save category
                </Button>
              </div>
            </AdminForm>
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium">Subcategories</h3>
              <ul className="flex flex-wrap gap-2">
                {subs
                  .filter((s) => s.categoryId === c.id)
                  .map((s) => (
                    <li key={s.id}>
                      <AdminForm action={toggleSubcategory.bind(null, s.id)}>
                        <button
                          type="submit"
                          title={s.isActive ? "Click to hide" : "Click to show"}
                          className={`rounded-full border px-3 py-1 text-xs ${s.isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground line-through"}`}
                        >
                          {s.name}
                        </button>
                      </AdminForm>
                    </li>
                  ))}
              </ul>
              <AdminForm action={addSubcategory} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="categoryId" value={c.id} />
                <TextField
                  idPrefix={`s-${c.id}`}
                  name="name"
                  label="New subcategory"
                  placeholder="Name"
                  required
                />
                <TextField
                  idPrefix={`s-${c.id}`}
                  name="slug"
                  label="Slug"
                  placeholder="e.g. in-store"
                  required
                />
                <Button type="submit" variant="outline" size="sm" className="mb-1">
                  Add
                </Button>
              </AdminForm>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
