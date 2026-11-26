"use client";

import { useRef, useState, useTransition } from "react";
import { FormMessage } from "./form-message";

type Action = (form: FormData) => Promise<{ error: string } | undefined | void>;

/**
 * Submits a server action without React's automatic form reset, so typed input
 * survives a validation error. Errors render inline; success redirects (from the action).
 */
export function AdminForm({
  action,
  className,
  children,
}: {
  action: Action;
  className?: string;
  children: React.ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          const result = await action(data);
          if (result && "error" in result) {
            setError(result.error);
            ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        });
      }}
    >
      {error && (
        <div className="col-span-full">
          <FormMessage error={error} />
        </div>
      )}
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
