import "server-only";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { shouldShowDemoData } from "@/lib/demo";
import { serverEnv } from "@/lib/env";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

// Cache pools across hot reloads in development and across invocations on Vercel.
const globalForDb = globalThis as unknown as { runtimeDb?: Db; adminDb?: Db };

function makeDb(url: string): Db {
  const pool = new Pool({ connectionString: url, max: 5 });
  return drizzle(pool, { schema, casing: "snake_case" });
}

/** Runtime connection (member of app_runtime). Used by Better Auth and public pages. */
export function runtimeDb(): Db {
  globalForDb.runtimeDb ??= makeDb(serverEnv().DATABASE_URL);
  return globalForDb.runtimeDb;
}

/**
 * Runs public read queries in a transaction with the request's RLS context.
 * Always use this (not runtimeDb() directly) for site content.
 */
export async function withPublicDb<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const showDemo = shouldShowDemoData(serverEnv());
  return runtimeDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.show_demo', ${showDemo ? "on" : "off"}, true)`);
    return fn(tx);
  });
}

/**
 * Admin connection (member of app_admin). Do not import from public code paths;
 * call through requireAdmin() in src/lib/admin.ts, which verifies the session first.
 */
export function adminDbUnsafe(): Db {
  globalForDb.adminDb ??= makeDb(serverEnv().ADMIN_DATABASE_URL);
  return globalForDb.adminDb;
}
