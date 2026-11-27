"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { buttonClass, inputClass, labelClass } from "@/components/app/public-form";
import { authClient } from "@/lib/auth-client";

/** Passwordless sign-in: Google (when configured) or a one-time email link. No paid anything. */
export function SignInForm({ google, next }: { google: boolean; next: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const callbackURL = next.startsWith("/") && !next.startsWith("//") ? next : "/profile";

  if (sent)
    return (
      <p role="status" className="rounded-xl border bg-surface p-4 text-sm">
        Check your inbox for a sign-in link. It works once and expires in 15 minutes.
      </p>
    );

  return (
    <div className="flex flex-col gap-4">
      {google && (
        <>
          <button
            type="button"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const { error } = await authClient.signIn.social({ provider: "google", callbackURL });
              if (error) {
                setPending(false);
                setError(error.message ?? "Google sign-in isn't available right now.");
              }
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border bg-surface px-4 text-sm font-semibold hover:border-emerald"
          >
            Continue with Google
          </button>
          <p className="text-center text-xs text-text-2">or</p>
        </>
      )}
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const email = String(new FormData(e.currentTarget).get("email") ?? "").trim();
          setPending(true);
          setError(null);
          const { error } = await authClient.signIn.magicLink({ email, callbackURL });
          setPending(false);
          if (error) setError(error.message ?? "We couldn't send the link. Try again in a minute.");
          else setSent(true);
        }}
      >
        <label htmlFor="si-email" className={labelClass}>
          Email
        </label>
        <input
          id="si-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className={buttonClass}>
          <Mail className="size-4" aria-hidden />
          {pending ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    </div>
  );
}
