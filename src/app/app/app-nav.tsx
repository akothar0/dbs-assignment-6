"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app", label: "Network" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/prep", label: "Prep" },
  { href: "/app/profile", label: "Profile" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-[#1f6f68] text-white"
                : "text-[#5f594f] hover:bg-[#eee7dc] hover:text-[#171512]"
            }`}
            href={item.href}
            key={item.href}
            >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
