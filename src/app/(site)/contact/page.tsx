import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/app/static-page";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

// TODO(founder): add the public contact email when it is confirmed.
export default function ContactPage() {
  return (
    <StaticPage title="Contact" intro="The quickest way to reach us depends on what you need.">
      <ul className="flex list-disc flex-col gap-2 pl-5">
        <li>
          Something wrong with a listing? Use “Report an inaccurate opportunity” on that listing.
        </li>
        <li>
          Run a company that pays people for tasks?{" "}
          <Link href="/submit-provider">Suggest your company</Link>.
        </li>
        <li>
          Brands looking for creators: see <Link href="/for-brands">For Brands</Link>.
        </li>
        <li>
          Press: see the <Link href="/press">press page</Link>.
        </li>
      </ul>
      <p>A general contact email will be published here soon.</p>
    </StaticPage>
  );
}
