"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { clearLocalAccountCache } from "@/components/app/saved-store";

export function UserSignOut({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={
        className ??
        "text-sm font-medium text-text-2 underline-offset-4 hover:text-foreground hover:underline"
      }
      onClick={async () => {
        await authClient.signOut();
        clearLocalAccountCache();
        router.push("/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
