"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/app/public-form";
import type { IntakeState } from "../../intake-actions";
import { unsubscribeDaily8 } from "../../email-actions";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<IntakeState, FormData>(
    unsubscribeDaily8,
    undefined,
  );
  if (state && "ok" in state)
    return (
      <p role="status" className="text-text-2">
        {state.ok}
      </p>
    );
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <p className="text-text-2">
        Stop all 8Tasks promotional emails (My Daily 8 and alerts) to this address?
      </p>
      <button type="submit" disabled={pending} className={buttonClass}>
        Unsubscribe
      </button>
    </form>
  );
}
