import "server-only";
import { headers } from "next/headers";
import { adminDbUnsafe } from "@/db/client";
import { checkAdmin, AdminAuthError } from "./admin-policy";
import { getAuth } from "./auth";

export { AdminAuthError };

/**
 * Server-side gate for every admin page, action and route (CLAUDE.md rule 4).
 * Returns the admin session and the app_admin database handle.
 */
export async function requireAdmin() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const denied = checkAdmin(session?.user);
  if (denied || !session) throw new AdminAuthError(denied ?? "unauthenticated");
  return { session, db: adminDbUnsafe() };
}
