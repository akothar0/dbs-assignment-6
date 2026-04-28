import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

const navItems = [
  { href: "/app/today", label: "Today" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/applications", label: "Applications" },
  { href: "/app/pipeline", label: "Pipeline" },
  { href: "/app/prep", label: "Prep" },
  { href: "/app/onboarding", label: "Profile" },
];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await auth.protect();

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#171512]">
      <header className="border-b border-[#d7d0c3] bg-[#fffbf4]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-8">
            <Link href="/app/today" className="text-lg font-semibold">
              Rolo
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#5f594f] transition hover:bg-[#eee7dc] hover:text-[#171512]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <UserButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-5 pb-3 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-[#5f594f] transition hover:bg-[#eee7dc] hover:text-[#171512]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
