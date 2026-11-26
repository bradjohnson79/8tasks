import "server-only";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { runtimeDb } from "@/db/client";
import { shouldShowDemoData } from "@/lib/demo";
import { serverEnv } from "@/lib/env";
import { getSession } from "./admin";

type Db = ReturnType<typeof runtimeDb>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** The signed-in user (any role) or null. Accounts are optional everywhere. */
export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/** Pages that only make sense signed in send guests to sign in (never for browsing). */
export async function requireUser(next = "/profile") {
  const user = await getUser();
  if (!user) redirect(`/profile/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Runs queries as the runtime role with app.user_id set for this transaction, so RLS only
 * exposes the signed-in user's own rows. Only call with an id from a verified session.
 */
export async function withUserDb<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const showDemo = shouldShowDemoData(serverEnv());
  return runtimeDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    await tx.execute(sql`select set_config('app.show_demo', ${showDemo ? "on" : "off"}, true)`);
    return fn(tx);
  });
}

/** Whether Google sign-in is configured (keys set by the founder). */
export function googleEnabled() {
  const e = serverEnv();
  return !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}
