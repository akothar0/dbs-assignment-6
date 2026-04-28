"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/app/today", label: "Today" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/pipeline", label: "Pipeline" },
  { href: "/app/prep", label: "Prep" },
  { href: "/app/onboarding", label: "Profile" },
];

export function AppNav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const navClass = compact
    ? "flex gap-1 overflow-x-auto px-5 pb-3 md:hidden"
    : "hidden items-center gap-1 md:flex";

  return (
    <nav className={navClass}>
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);

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
