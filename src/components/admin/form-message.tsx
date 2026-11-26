/** Shows ?error= / ?saved= feedback set by admin server actions after redirect. */
export function FormMessage({ error, saved }: { error?: string; saved?: string }) {
  if (error)
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      >
        {error}
      </p>
    );
  if (saved)
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
      >
        {saved}
      </p>
    );
  return null;
}
