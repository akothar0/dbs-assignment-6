import { saveProfile } from "@/app/app/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function OnboardingPage() {
  return <OnboardingContent />;
}

async function OnboardingContent() {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .maybeSingle();

  return (
    <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Recruiting profile
        </h1>
        <p className="mt-2 max-w-2xl text-[#6d665c]">
          Rolo uses this context to tailor outreach drafts to your background,
          target roles, and preferred writing style.
        </p>
      </div>

      <form
        action={saveProfile}
        className="space-y-5 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5"
      >
        <label className="block">
          <span className="text-sm font-semibold">Full name</span>
          <input
            name="full_name"
            defaultValue={profile?.full_name ?? ""}
            className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Background summary</span>
          <textarea
            name="background_summary"
            defaultValue={profile?.background_summary ?? ""}
            rows={4}
            className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Resume context</span>
          <textarea
            name="resume_text"
            defaultValue={profile?.resume_text ?? ""}
            rows={6}
            className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold">Target roles</span>
            <textarea
              name="target_roles"
              defaultValue={profile?.target_roles.join(", ") ?? ""}
              rows={3}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Target companies</span>
            <textarea
              name="target_companies"
              defaultValue={profile?.target_companies.join(", ") ?? ""}
              rows={3}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold">Writing preferences</span>
          <textarea
            name="writing_preferences"
            defaultValue={profile?.writing_preferences ?? ""}
            rows={3}
            className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Recruiting deadline</span>
          <input
            type="date"
            name="recruiting_deadline"
            defaultValue={profile?.recruiting_deadline ?? ""}
            className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
          />
        </label>

        <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
          Save profile
        </button>
      </form>
    </div>
  );
}
