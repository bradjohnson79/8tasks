import { requireAdminPage } from "@/lib/admin";
import { ChangePasswordForm } from "./change-password-form";

export const metadata = { title: "Account" };

export default async function AdminAccountPage() {
  const { session } = await requireAdminPage();
  return (
    <div className="flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Signed in as {session.user.email}</p>
      </div>
      <section className="rounded-xl border p-5">
        <h2 className="mb-1 text-lg font-semibold">Change password</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          At least 12 characters. Other signed-in sessions are signed out when you change it.
        </p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
