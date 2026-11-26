"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/opportunities", label: "Opportunities" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/discovery", label: "Discovery" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin/email", label: "Email" },
  { href: "/admin/earnings", label: "Earnings" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/admin/account", label: "Account" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto">
      {ITEMS.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-white/75 hover:bg-white/10 hover:text-white",
              active && "bg-white/10 text-white",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
