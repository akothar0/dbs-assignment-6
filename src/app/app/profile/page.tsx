import { createCompany, saveProfile } from "@/app/app/actions";
import { SubmitButton } from "@/app/app/form-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: targetCompanies }] = await Promise.all([
    supabase.from("user_profiles").select("*").maybeSingle(),
    supabase
      .from("companies")
      .select("id, name, notes, target_roles, updated_at")
      .eq("is_target", true)
      .order("updated_at", { ascending: false }),
  ]);

  const voiceSamples = Array.isArray(profile?.voice_samples) ? profile.voice_samples : [];

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#d7d0c3] bg-[#fffbf4] p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">
          Profile
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your persistent context.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f594f]">
          Keep your background, targets, and writing voice in one place so the
          assistant does not need to ask again.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <form action={saveProfile} className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5 space-y-4">
          <h2 className="text-lg font-semibold">About you</h2>
          <label className="block">
            <span className="text-sm font-semibold">Full name</span>
            <input name="full_name" defaultValue={profile?.full_name ?? ""} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Resume</span>
            <textarea name="resume_text" defaultValue={profile?.resume_text ?? ""} rows={8} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Current situation</span>
            <textarea name="current_situation" defaultValue={profile?.current_situation ?? ""} rows={4} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
          </label>
          <div className="grid gap-4">
            <label className="block">
              <span className="text-sm font-semibold">Voice sample 1</span>
              <textarea name="voice_sample_1" defaultValue={voiceSamples[0] ?? ""} rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Voice sample 2</span>
              <textarea name="voice_sample_2" defaultValue={voiceSamples[1] ?? ""} rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Voice sample 3</span>
              <textarea name="voice_sample_3" defaultValue={voiceSamples[2] ?? ""} rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
          </div>
          <SubmitButton label="Save profile" pendingLabel="Saving..." />
        </form>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
            <h2 className="text-lg font-semibold">Targets</h2>
            <p className="mt-1 text-sm text-[#6d665c]">
              Free-text first. These companies power the home feed and company list.
            </p>
            <form action={createCompany} className="mt-4 space-y-3">
              <input type="hidden" name="is_target" value="true" />
              <label className="block">
                <span className="text-sm font-semibold">Company name</span>
                <input name="name" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Why it matters</span>
                <textarea name="notes" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Roles to target</span>
                <textarea name="target_roles" rows={2} placeholder="Product Manager, PMM" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <SubmitButton label="Add target" pendingLabel="Adding..." variant="secondary" />
            </form>
          </section>

          <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
            <h2 className="text-lg font-semibold">Target companies</h2>
            <div className="mt-4 grid gap-3">
              {targetCompanies?.length ? (
                targetCompanies.map((company: any) => (
                  <article key={company.id} className="rounded-2xl border border-[#e3dacc] bg-white p-4">
                    <p className="font-semibold">{company.name}</p>
                    {company.notes ? <p className="mt-2 text-sm text-[#4b463d]">{company.notes}</p> : null}
                    {company.target_roles?.length ? (
                      <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#6d665c]">
                        {company.target_roles.join(" · ")}
                      </p>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-[#6d665c]">No target companies yet.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
