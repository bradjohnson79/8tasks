import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/app/container";
import { getUser, googleEnabled } from "@/lib/account";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(next && next.startsWith("/") ? next : "/profile");
  return (
    <Container className="flex max-w-md flex-col gap-5 pt-8 pb-10">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Sign in or create a free account</h1>
        <p className="mt-1 text-sm text-text-2">
          Browse freely. Register for convenience. Never pay for access. An account lets you keep
          saves on every device, personalize My Daily 8 and track your own missions and earnings.
        </p>
      </div>
      <SignInForm google={googleEnabled()} next={next ?? "/profile"} />
      <p className="text-xs text-text-2">
        Signing in doesn&apos;t subscribe you to any emails. No passwords, no payment details, ever.
      </p>
    </Container>
  );
}
