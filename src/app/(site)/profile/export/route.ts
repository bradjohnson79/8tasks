import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { userEarnings, userMissions, userProfiles, userSavedItems, userSavedSearches } from "@/db/schema";
import { getUser, withUserDb } from "@/lib/account";

export const dynamic = "force-dynamic";

/** Personal data export (everything 8Tasks holds about the signed-in user). */
export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse(null, { status: 401 });
  const data = await withUserDb(user.id, async (tx) => ({
    account: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
    profile: (await tx.select().from(userProfiles))[0] ?? null,
    savedItems: await tx.select().from(userSavedItems),
    savedSearches: await tx.select().from(userSavedSearches),
    missions: await tx.select().from(userMissions),
    earnings: await tx.select().from(userEarnings),
    emailSubscription: (await tx.execute<{ s: unknown }>(sql`select email_account_get() as s`)).rows[0]?.s ?? null,
    exportedAt: new Date().toISOString(),
  }));
  // The manage-email token is a secret link; leave it out of downloads.
  if (data.emailSubscription && typeof data.emailSubscription === "object")
    delete (data.emailSubscription as Record<string, unknown>).token;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-8tasks-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
