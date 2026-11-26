"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** onSubmit wrapper: keeps typed values (no automatic form reset on error). */
function submitWith(fn: (form: FormData) => Promise<unknown>) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void fn(new FormData(e.currentTarget));
  };
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPassword(form: FormData) {
    setPending(true);
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) return setError(error.message ?? "Email or password is incorrect.");
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return setStep("code");
    router.replace("/admin");
    router.refresh();
  }

  async function onCode(form: FormData) {
    setPending(true);
    setError(null);
    const code = String(form.get("code")).replace(/\s/g, "");
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return setError(error.message ?? "That code didn't work. Try the latest one.");
    router.replace("/admin");
    router.refresh();
  }

  if (step === "code") {
    return (
      <form onSubmit={submitWith(onCode)} className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Two-factor check</h1>
          <p className="text-sm text-muted-foreground">
            {useBackup
              ? "Enter one of your backup codes."
              : "Enter the 6-digit code from your authenticator app."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">{useBackup ? "Backup code" : "Code"}</Label>
          <Input
            id="code"
            name="code"
            inputMode={useBackup ? "text" : "numeric"}
            autoComplete="one-time-code"
            required
            autoFocus
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Verify"}
        </Button>
        <button
          type="button"
          className="text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => setUseBackup((v) => !v)}
        >
          {useBackup ? "Use authenticator code" : "Use a backup code instead"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submitWith(onPassword)} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Admin sign in</h1>
        <p className="text-sm text-muted-foreground">For 8Tasks staff only.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
