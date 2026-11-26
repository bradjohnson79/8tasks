import { desc, eq } from "drizzle-orm";
import { adminAuditLog, user } from "@/db/schema";
import { requireAdminPage } from "@/lib/admin";

export const metadata = { title: "Audit log" };

export default async function AuditLogPage() {
  const { db } = await requireAdminPage();
  const rows = await db
    .select({
      id: adminAuditLog.id,
      action: adminAuditLog.action,
      entityType: adminAuditLog.entityType,
      entityId: adminAuditLog.entityId,
      createdAt: adminAuditLog.createdAt,
      actor: user.email,
    })
    .from(adminAuditLog)
    .leftJoin(user, eq(user.id, adminAuditLog.actorUserId))
    .orderBy(desc(adminAuditLog.id))
    .limit(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="text-muted-foreground">
          Every admin change, newest first. Entries can&apos;t be edited or deleted.
        </p>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">When (UTC)</th>
              <th className="px-4 py-3 font-medium">Who</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Record</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                  {r.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-4 py-2">{r.actor ?? "system"}</td>
                <td className="px-4 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                  {r.entityType} {r.entityId?.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
