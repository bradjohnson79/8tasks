"use client";

import Link from "next/link";
import { useActionState } from "react";
import { buttonClass } from "@/components/app/public-form";
import { confirmDaily8, type ConfirmState } from "../../email-actions";

/** A button (not a GET link) so mail scanners can't confirm on someone's behalf. */
export function ConfirmForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmDaily8, undefined);
  if (state && "ok" in state)
    return (
      <div role="status" className="flex flex-col gap-3">
        <p>You&apos;re confirmed. Your first My Daily 8 arrives at your chosen time.</p>
        <Link
          href={`/email/preferences?token=${state.token}`}
          className="text-emerald hover:underline"
        >
          Manage your preferences
        </Link>
      </div>
    );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      {state && "error" in state && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Confirming…" : "Confirm my email"}
      </button>
    </form>
  );
}
