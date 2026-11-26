import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  Bookmark,
  ChartNoAxesColumn,
  ClipboardCheck,
  Mail,
  Megaphone,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/app/container";
import { FormMessage } from "@/components/admin/form-message";
import { UserSignOut } from "@/components/account/sign-out";
import { userProfiles } from "@/db/schema";
import { getUser, withUserDb } from "@/lib/account";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Profile", robots: { index: false } };

const SECTIONS = [
  { href: "/daily-8", icon: Sparkles, title: "My Daily 8", body: "Up to eight picks that fit your preferences." },
  { href: "/saved", icon: Bookmark, title: "Saved", body: "Saved opportunities and searches, on every device." },
  { href: "/profile/missions", icon: ClipboardCheck, title: "My Missions", body: "Keep track of what you've applied for." },
  { href: "/profile/earnings", icon: ChartNoAxesColumn, title: "My Earnings", body: "Your own log of what providers paid you." },
  { href: "/profile/email", icon: Mail, title: "Email & Alerts", body: "Free My Daily 8 emails, only if you want them." },
  { href: "/profile/preferences", icon: SlidersHorizontal, title: "My Preferences", body: "Choose your adventure: interests, location, equipment." },
  { href: "/profile/promote", icon: Megaphone, title: "Promote 8Tasks", body: "Partner program (coming later)." },
  { href: "/profile/privacy", icon: ShieldCheck, title: "Privacy & Account", body: "Download your data or delete your account." },
];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await getUser();
  const sp = await searchParams;
  if (!user)
    return (
      <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Profile</h1>
        <div className="rounded-2xl border bg-surface p-5">
          <p className="font-semibold">Browse freely. Register for convenience. Never pay for access.</p>
          <p className="mt-1 text-sm text-text-2">
            Everything on 8Tasks works without an account. A free account keeps your saves on every
            device, personalizes My Daily 8 and lets you track your own missions and earnings.
          </p>
          <Link
            href="/profile/sign-in"
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground"
          >
            Sign in or create a free account
          </Link>
        </div>
      </Container>
    );

  const [profile] = await withUserDb(user.id, (tx) =>
    tx.select({ onboardedAt: userProfiles.onboardedAt, displayName: userProfiles.displayName }).from(userProfiles).where(eq(userProfiles.userId, user.id)),
  );
  // First visit: offer "Choose your adventure" (skippable).
  if (!profile?.onboardedAt) redirect("/profile/preferences?welcome=1");

  return (
    <Container className="flex flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">
            {profile.displayName ? `Hi, ${profile.displayName}` : "Your account"}
          </h1>
          <p className="text-sm text-text-2">{user.email} · Free, always.</p>
        </div>
        <UserSignOut />
      </div>
      <FormMessage saved={sp.saved} />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex h-full flex-col gap-2 rounded-2xl border bg-surface p-4 hover:border-emerald">
              <s.icon className="size-5 text-emerald" aria-hidden />
              <span className="font-semibold">{s.title}</span>
              <span className="text-sm text-text-2">{s.body}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-text-2">
        My Missions and My Earnings are your own notes. 8Tasks doesn&apos;t verify third-party work,
        hold money or pay users; providers pay you directly.
      </p>
    </Container>
  );
}
