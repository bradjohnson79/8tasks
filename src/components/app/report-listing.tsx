import { Flag } from "lucide-react";
import { reportListing } from "@/app/(site)/intake-actions";
import { REPORT_REASONS } from "@/lib/intake/schemas";
import { buttonClass, inputClass, labelClass, PublicForm } from "./public-form";

/** "Report an inaccurate opportunity" (master prompt §3.6.9). Goes to the admin queue only. */
export function ReportListing({
  opportunityId,
  providerId,
}: {
  opportunityId?: string;
  providerId?: string;
}) {
  return (
    <details className="group rounded-xl border bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-text-2 hover:text-foreground">
        <Flag className="size-4" aria-hidden />
        Report an inaccurate opportunity
      </summary>
      <div className="border-t p-4">
        <PublicForm action={reportListing} className="relative flex flex-col gap-3">
          {opportunityId && <input type="hidden" name="opportunityId" value={opportunityId} />}
          {providerId && <input type="hidden" name="providerId" value={providerId} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-reason" className={labelClass}>
              What&apos;s wrong?
            </label>
            <select
              id="report-reason"
              name="reason"
              required
              className={inputClass}
              defaultValue=""
            >
              <option value="" disabled>
                Choose one
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-details" className={labelClass}>
              Details <span className="font-normal text-text-2">(optional)</span>
            </label>
            <textarea
              id="report-details"
              name="details"
              maxLength={2000}
              rows={3}
              className={`${inputClass} h-auto py-2`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="report-email" className={labelClass}>
              Your email{" "}
              <span className="font-normal text-text-2">(optional, only if we may follow up)</span>
            </label>
            <input id="report-email" name="contactEmail" type="email" className={inputClass} />
          </div>
          <p className="text-xs text-text-2">
            Reports are reviewed by a person. We never publish them or remove a listing
            automatically.
          </p>
          <button type="submit" className={buttonClass}>
            Send report
          </button>
        </PublicForm>
      </div>
    </details>
  );
}
