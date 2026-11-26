"use client";

import { useRef, useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import type { IntakeState } from "@/app/(site)/intake-actions";

/**
 * Public form wrapper: keeps input on error, shows a success message instead of the
 * form once submitted, and includes a hidden honeypot field.
 */
export function PublicForm({
  action,
  className,
  children,
  keepForm = false,
}: {
  action: (form: FormData) => Promise<IntakeState>;
  className?: string;
  children: React.ReactNode;
  /** Keep the form visible after success (e.g. preferences). */
  keepForm?: boolean;
}) {
  const [state, setState] = useState<IntakeState>(undefined);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  if (state && "ok" in state && !keepForm)
    return (
      <p role="status" className="flex items-start gap-2 rounded-xl border bg-surface p-4 text-sm">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald" aria-hidden />
        {state.ok}
      </p>
    );

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => setState(await action(data)));
      }}
    >
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {state && "ok" in state && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <CircleCheck className="size-4 shrink-0 text-emerald" aria-hidden />
          {state.ok}
        </p>
      )}
      {state && "error" in state && (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      )}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border bg-surface px-3 text-[15px] outline-none placeholder:text-text-2 focus-visible:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30";
export const labelClass = "text-sm font-medium";
export const buttonClass =
  "flex h-11 items-center justify-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-foreground hover:bg-action/80 disabled:opacity-60";
