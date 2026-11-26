import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/admin/sign-out-button";
import { requireAdminPage } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireAdminPage();
  return (
    <>
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-lg bg-mint text-xs font-bold text-navy">
              8
            </span>
            Admin
          </Link>
          <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
            <AdminNav />
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-white/70">
            <span className="hidden md:inline">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </>
  );
}
