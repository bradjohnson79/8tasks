import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminDbUnsafe } from "@/db/client";
import { adminAuditLog } from "@/db/schema";
import { AdminAuthError, checkAdmin } from "./admin-policy";
import { getAuth } from "./auth";

export { AdminAuthError };

export async function getSession() {
  return getAuth().api.getSession({ headers: await headers() });
}

/**
 * Server-side gate for every admin server action and route handler (CLAUDE.md rule 4).
 * Returns the admin session and the app_admin database handle, or throws.
 */
export async function requireAdmin() {
  const session = await getSession();
  const denied = checkAdmin(session?.user);
  if (denied || !session) throw new AdminAuthError(denied ?? "unauthenticated");
  return { session, db: adminDbUnsafe() };
}

/** Same gate for admin pages: redirects to login / 2FA setup instead of throwing. */
export async function requireAdminPage() {
  const session = await getSession();
  const denied = checkAdmin(session?.user);
  if (denied === "unauthenticated") redirect("/admin/login");
  if (denied === "mfa_required") redirect("/admin/setup-2fa");
  if (denied || !session) notFound();
  return { session, db: adminDbUnsafe() };
}

type AdminDb = ReturnType<typeof adminDbUnsafe>;

/** Append an admin audit entry. Call inside the same transaction as the change. */
export async function audit(
  db: Pick<AdminDb, "insert">,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  await db.insert(adminAuditLog).values({
    actorUserId,
    action,
    entityType,
    entityId,
    before: before ?? null,
    after: after ?? null,
  });
}
