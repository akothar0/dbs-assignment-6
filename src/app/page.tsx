import Link from "next/link";
import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

const workspacePreview = [
  {
    area: "Today",
    title: "Prep for Stripe PM coffee chat",
    detail: "Use notes from Daniel and your fintech resume bullets.",
  },
  {
    area: "Relationships",
    title: "Priya Nair · Bain",
    detail: "Replied yesterday. Referral ask draft is ready to review.",
  },
  {
    area: "Applications",
    title: "Google APM MBA internship",
    detail: "Target role with campus deadline on Oct 14.",
  },
  {
    area: "Prep",
    title: "Consulting behavioral stories",
    detail: "Tighten leadership, conflict, and ambiguity examples.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f4ee] text-[#171512]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 md:px-10">
        <nav className="flex items-center justify-between border-b border-[#d7d0c3] pb-5">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Rolo
          </Link>
          <div className="flex items-center gap-3 text-sm font-medium">
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="hidden text-[#5f594f] sm:block">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-white transition hover:bg-[#195b55]">
                  Start
                </button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/app/today" className="hidden text-[#5f594f] sm:block">
                Open workspace
              </Link>
              <UserButton />
            </Show>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">
              MBA recruiting operating system
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-[#171512] md:text-7xl">
              Run your recruiting search from one focused workspace.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#5f594f]">
              Rolo brings relationships, applications, prep, deadlines, and
              AI-assisted outreach into one daily workflow for MBA recruiting.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Show when="signed-out">
                <SignUpButton mode="modal">
                  <button className="rounded-md bg-[#1f6f68] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#195b55]">
                    Create account
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/app/today"
                  className="rounded-md bg-[#1f6f68] px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#195b55]"
                >
                Open workspace
                </Link>
              </Show>
              <Link
                href="/app/applications"
                className="rounded-md border border-[#c9c0b2] px-5 py-3 text-center text-sm font-semibold text-[#29251f] transition hover:border-[#8f8574]"
              >
                View applications
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-4 shadow-[0_24px_80px_rgba(41,37,31,0.12)]">
            <div className="flex items-center justify-between border-b border-[#e3dacc] pb-4">
              <div>
                <p className="text-sm font-semibold text-[#171512]">
                  Workspace snapshot
                </p>
                <p className="text-sm text-[#6d665c]">
                  Relationships, roles, prep, and actions
                </p>
              </div>
              <span className="rounded-md bg-[#e5f0ee] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                Live preview
              </span>
            </div>
            <div className="divide-y divide-[#e3dacc]">
              {workspacePreview.map((item) => (
                <div
                  key={item.title}
                  className="grid gap-3 py-4 sm:grid-cols-[0.42fr_1fr]"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f6f68]">
                      {item.area}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-[#171512]">{item.title}</p>
                    <p className="text-sm text-[#6d665c]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md bg-[#171512] p-4 text-white">
              <p className="text-sm font-semibold">AI prep brief ready</p>
              <p className="mt-2 text-sm leading-6 text-[#d8d2c8]">
                “Lead with your operator-to-product transition, ask about team
                rituals, and close by confirming referral timing after the
                application deadline.”
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
