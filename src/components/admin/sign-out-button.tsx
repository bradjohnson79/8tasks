"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-white/80 hover:bg-white/10 hover:text-white"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      <LogOutIcon /> Sign out
    </Button>
  );
}
