import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/admin";
import { SetupTwoFactor } from "./setup-two-factor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Set up two-factor" };

export default async function SetupTwoFactorPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.user.role !== "admin" || session.user.banned) notFound();
  if (session.user.twoFactorEnabled) redirect("/admin");
  return <SetupTwoFactor email={session.user.email} />;
}
