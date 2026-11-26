import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { Container } from "@/components/app/container";
import { buttonClass, inputClass, labelClass, PublicForm } from "@/components/app/public-form";
import { FormMessage } from "@/components/admin/form-message";
import { userMissions } from "@/db/schema";
import { requireUser, withUserDb } from "@/lib/account";
import { addMission, updateMission } from "../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My Missions", robots: { index: false } };

const STATUSES = [
  { value: "interested", label: "Interested" },
  { value: "applied", label: "Applied" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "not_pursuing", label: "Not pursuing" },
];

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser("/profile/missions");
  const sp = await searchParams;
  const rows = await withUserDb(user.id, (tx) =>
    tx.select().from(userMissions).orderBy(desc(userMissions.updatedAt)),
  );
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-5 pb-10 sm:pt-8">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight sm:text-[32px]">My Missions</h1>
        <p className="text-sm text-text-2">
          Your personal tracker. 8Tasks doesn&apos;t verify or approve third-party assignments;
          providers do.
        </p>
      </div>
      <FormMessage saved={sp.saved} />
      <ul className="flex flex-col gap-2">
        {rows.map((m) => (
          <li
            key={m.id}
            className="flex flex-col gap-2 rounded-xl border bg-surface p-3 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-text-2">{m.providerName}</p>
            </div>
            <form
              action={updateMission.bind(null, m.id) as never}
              className="flex items-center gap-2"
            >
              <select
                name="status"
                defaultValue={m.status}
                aria-label="Status"
                className={`${inputClass} h-9 w-40`}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button type="submit" className="h-9 rounded-lg border px-3 text-sm">
                Save
              </button>
              <button
                type="submit"
                name="delete"
                value="1"
                className="h-9 rounded-lg px-2 text-sm text-text-2"
              >
                Remove
              </button>
            </form>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-text-2">Nothing tracked yet.</li>}
      </ul>
      <section className="rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Track a mission</h2>
        <PublicForm action={addMission} className="relative grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-provider" className={labelClass}>
              Provider
            </label>
            <input
              id="m-provider"
              name="providerName"
              required
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-title" className={labelClass}>
              What
            </label>
            <input id="m-title" name="title" required maxLength={160} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-status" className={labelClass}>
              Status
            </label>
            <select id="m-status" name="status" className={inputClass}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="m-notes" className={labelClass}>
              Notes
            </label>
            <input id="m-notes" name="notes" maxLength={2000} className={inputClass} />
          </div>
          <button type="submit" className={`${buttonClass} sm:col-span-2`}>
            Add
          </button>
        </PublicForm>
      </section>
    </Container>
  );
}
