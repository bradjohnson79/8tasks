import type { Metadata } from "next";
import { Container } from "@/components/app/container";
import { PublicForm, inputClass, labelClass } from "@/components/app/public-form";
import { UserSignOut } from "@/components/account/sign-out";
import { requireUser } from "@/lib/account";
import { deleteAccount } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy & Account", robots: { index: false } };

export default async function PrivacyPage() {
  const user = await requireUser("/profile/privacy");
  return (
    <Container className="flex max-w-2xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">Privacy & Account</h1>
      <section className="flex flex-col gap-2 rounded-2xl border bg-surface p-4 text-sm">
        <h2 className="font-semibold">What we keep</h2>
        <p className="text-text-2">
          Your email ({user.email}), the preferences you choose, your saves and searches, and any
          missions or earnings you log. No phone number, address, ID or banking details. Nothing is
          sold or shown publicly. Sign-in sessions expire after 12 hours of inactivity.
        </p>
        <a href="/profile/export" className="w-fit font-medium text-emerald hover:underline">
          Download my data (JSON)
        </a>
      </section>
      <section className="flex flex-col gap-3 rounded-2xl border border-error/40 p-4">
        <h2 className="font-semibold">Delete my account</h2>
        <p className="text-sm text-text-2">
          Permanently deletes your account, preferences, saves, missions, earnings log and email
          subscription. If an address bounced or reported spam, we keep only that address on a
          do-not-email list, as the law requires.
        </p>
        <PublicForm action={deleteAccount} className="relative flex flex-col gap-2">
          <label htmlFor="del-confirm" className={labelClass}>
            Type DELETE to confirm
          </label>
          <input id="del-confirm" name="confirm" autoComplete="off" className={inputClass} />
          <button type="submit" className="flex h-11 items-center justify-center rounded-xl border border-error/60 px-4 text-sm font-semibold text-error">
            Delete my account
          </button>
        </PublicForm>
      </section>
      <UserSignOut />
    </Container>
  );
}
