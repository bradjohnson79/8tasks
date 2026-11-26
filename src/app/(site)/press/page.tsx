import type { Metadata } from "next";
import { StaticPage } from "@/components/app/static-page";

export const metadata: Metadata = { title: "Press", alternates: { canonical: "/press" } };

// TODO(founder): add the press contact email when it is confirmed.
export default function PressPage() {
  return (
    <StaticPage title="Press">
      <h2>About 8Tasks</h2>
      <p>
        8Tasks.com is a free discovery site for legitimate ways to earn extra money in Canada and
        the United States: surveys, app and website testing, photography, mystery shopping, content
        and media, gaming, paid research and microtasks. Providers handle sign-up, tasks and
        payment; 8Tasks earns referral commissions from some of them. Access is always free for
        everyone.
      </p>
      <p>Tagline: Small Missions. Real Money. Always Free. For Everyone.</p>
      <h2>Press contact</h2>
      <p>A press contact email will be published here soon.</p>
    </StaticPage>
  );
}
