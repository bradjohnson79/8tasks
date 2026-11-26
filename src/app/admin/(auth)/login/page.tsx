import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin";
import { checkAdmin } from "@/lib/admin-policy";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session && !checkAdmin(session.user)) redirect("/admin");
  return <LoginForm />;
}
