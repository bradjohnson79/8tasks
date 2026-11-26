"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
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

export function SetupTwoFactor({ email }: { email: string }) {
  const router = useRouter();
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onPassword(form: FormData) {
    setPending(true);
    setError(null);
    const { data, error } = await authClient.twoFactor.enable({
      password: String(form.get("password")),
    });
    setPending(false);
    if (error || !data || data.method !== "totp")
      return setError(error?.message ?? "Couldn't start setup. Check your password.");
    setQr(await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }));
    setSecret(new URL(data.totpURI).searchParams.get("secret"));
    setBackupCodes(data.backupCodes);
  }

  async function onVerify(form: FormData) {
    setPending(true);
    setError(null);
    const { error } = await authClient.twoFactor.verifyTotp({
      code: String(form.get("code")).replace(/\s/g, ""),
    });
    setPending(false);
    if (error) return setError(error.message ?? "That code didn't work. Try the latest one.");
    router.replace("/admin");
    router.refresh();
  }

  if (!qr) {
    return (
      <form onSubmit={submitWith(onPassword)} className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Set up two-factor sign-in</h1>
          <p className="text-sm text-muted-foreground">
            Admin access requires an authenticator app (1Password, Google Authenticator, Authy…).
            Confirm your password for {email} to begin.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
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
          {pending ? "Starting…" : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={submitWith(onVerify)} className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">Scan this code</h1>
        <p className="text-sm text-muted-foreground">
          Scan with your authenticator app, then enter the 6-digit code.
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt="QR code for your authenticator app"
        className="mx-auto rounded-lg bg-white p-2"
        width={220}
        height={220}
      />
      {secret && (
        <p className="text-center text-xs text-muted-foreground">
          Can&apos;t scan? Enter this key:{" "}
          <code className="font-mono break-all text-foreground">{secret}</code>
        </p>
      )}
      <details className="rounded-xl border p-3 text-sm">
        <summary className="cursor-pointer font-medium">Backup codes (save these now)</summary>
        <p className="mt-2 text-muted-foreground">
          Each code works once if you lose your phone. They won&apos;t be shown again.
        </p>
        <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-xs">
          {backupCodes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">6-digit code</Label>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Verifying…" : "Turn on two-factor"}
      </Button>
    </form>
  );
}
