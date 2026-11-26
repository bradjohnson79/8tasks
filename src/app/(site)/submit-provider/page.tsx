import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { getActiveCategories } from "@/db/queries/public";
import { submitProvider } from "../intake-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Suggest a company",
  description: "Tell 8Tasks about a company that pays people for tasks. Listing is free.",
  alternates: { canonical: "/submit-provider" },
};

export default async function SubmitProviderPage() {
  const categories = await getActiveCategories();
  return (
    <Container className="flex max-w-2xl flex-col gap-5 pt-5 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Suggest a company</h1>
        <p className="mt-1 text-text-2">
          Run a platform that pays people for surveys, testing, photography, content or research?
          Tell us about it. We review every company by hand before listing it, and listing is never
          paid.
        </p>
      </div>
      <PublicForm action={submitProvider} className="relative flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-company" className={labelClass}>
            Company name
          </label>
          <input
            id="s-company"
            name="companyName"
            required
            maxLength={120}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-website" className={labelClass}>
            Website
          </label>
          <input
            id="s-website"
            name="websiteUrl"
            required
            inputMode="url"
            placeholder="https://"
            maxLength={300}
            className={inputClass}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-name" className={labelClass}>
              Your name <span className="font-normal text-text-2">(optional)</span>
            </label>
            <input id="s-name" name="contactName" maxLength={120} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="s-email" className={labelClass}>
              Contact email
            </label>
            <input id="s-email" name="contactEmail" type="email" required className={inputClass} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-category" className={labelClass}>
            Best category
          </label>
          <select id="s-category" name="categorySlug" defaultValue="" className={inputClass}>
            <option value="">Not sure</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="s-notes" className={labelClass}>
            Notes <span className="font-normal text-text-2">(optional)</span>
          </label>
          <textarea
            id="s-notes"
            name="notes"
            rows={4}
            maxLength={2000}
            placeholder="Where you accept members, how people are paid, any affiliate program…"
            className={`${inputClass} h-auto py-2`}
          />
        </div>
        <p className="text-xs text-text-2">
          We don&apos;t list companies that charge workers fees, involve gambling, MLM or fake
          reviews.
        </p>
        <button type="submit" className={buttonClass}>
          Send
        </button>
      </PublicForm>
    </Container>
  );
}
