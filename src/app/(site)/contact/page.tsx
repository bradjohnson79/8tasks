import type { Metadata } from "next";
import Link from "next/link";
import { StaticPage } from "@/components/app/static-page";
import { OPERATOR } from "@/lib/seo";

export const metadata: Metadata = { title: "Contact", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <StaticPage
      title="Contact"
      intro={`8Tasks is run by ${OPERATOR.legalName}, ${OPERATOR.locality}, ${OPERATOR.region}, ${OPERATOR.country}.`}
    >
      <p>
        Email:{" "}
        <a href={`mailto:${OPERATOR.email}`} className="font-medium">
          {OPERATOR.email}
        </a>
        . We reply to every message, usually within a few business days. Privacy requests (access,
        correction, deletion) go to the same address.
      </p>
      <p>The quickest way to reach us depends on what you need:</p>
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
    </StaticPage>
  );
}
