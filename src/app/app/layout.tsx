import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AppNav } from "@/app/app/app-nav";

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
            <AppNav />
          </div>
          <UserButton />
        </div>
        <AppNav compact />
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
