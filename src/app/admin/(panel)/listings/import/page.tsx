import { redirect } from "next/navigation";

/** Listings import uses the provider import page (same validator, preview and audit). */
export default function ListingsImportPage() {
  redirect("/admin/import");
}
