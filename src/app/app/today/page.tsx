import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function TodayPage() {
  return <TodayContent />;
}

async function TodayContent() {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, target_roles, target_companies, onboarding_completed_at")
    .maybeSingle();
  const { count: contactCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Today&apos;s queue
        </h1>
        <p className="mt-2 text-[#6d665c]">
          A focused command center for follow-ups, thank-yous, and reconnects.
        </p>
      </div>

      {!profile?.onboarding_completed_at ? (
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="font-semibold">Finish your recruiting profile</p>
          <p className="mt-2 text-sm leading-6 text-[#6d665c]">
            Add your background and target roles before drafting outreach.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-4 inline-flex rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]"
          >
            Complete profile
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Contacts tracked</p>
          <p className="mt-3 text-3xl font-semibold">{contactCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Target roles</p>
          <p className="mt-3 text-xl font-semibold">
            {profile?.target_roles.length ? profile.target_roles.length : 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Target companies</p>
          <p className="mt-3 text-xl font-semibold">
            {profile?.target_companies.length
              ? profile.target_companies.length
              : 0}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-[#c9c0b2] bg-[#fffbf4] p-8">
        <p className="font-medium">No rule-based actions yet</p>
        <p className="mt-2 text-sm leading-6 text-[#6d665c]">
          Log interactions in the next slice to generate follow-up tasks.
        </p>
      </div>
    </div>
  );
}
