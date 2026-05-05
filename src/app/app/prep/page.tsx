import Link from "next/link";
import {
  createBehavioralStory,
  createMeeting,
  savePrepBrief,
} from "@/app/app/actions";
import { SubmitButton } from "@/app/app/form-controls";
import { PrepAiPreview } from "@/app/app/prep-ai-preview";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function PrepPage({
  searchParams,
}: {
  searchParams: Promise<{ contact_id?: string; meeting_id?: string }>;
}) {
  const { contact_id: contactIdParam, meeting_id: meetingIdParam } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [
    { data: contactsData },
    { data: meetingsData },
    { data: briefsData },
    { data: storiesData },
    { data: profileData },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, role, company_id, company:companies(id, name)")
      .order("name", { ascending: true }),
    supabase
      .from("meetings")
      .select("id, contact_id, meeting_type, scheduled_for, title, status, contact:contacts(id, name), company:companies(id, name)")
      .order("scheduled_for", { ascending: true }),
    supabase
      .from("prep_briefs")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase
      .from("behavioral_stories")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase
      .from("user_profiles")
      .select("user_id, full_name, background_summary, current_situation, voice_samples")
      .maybeSingle(),
  ]);

  const contacts = (contactsData ?? []) as any[];
  const meetings = (meetingsData ?? []) as any[];
  const briefs = (briefsData ?? []) as any[];
  const stories = (storiesData ?? []) as any[];
  const profile = profileData ?? null;

  const focusMeeting = meetingIdParam
    ? meetings.find((meeting: any) => meeting.id === meetingIdParam)
    : meetings.find((meeting: any) => meeting.status === "scheduled") ?? null;

  const focusContact = contactIdParam
    ? contacts.find((contact: any) => contact.id === contactIdParam)
    : focusMeeting
      ? contacts.find((contact: any) => contact.id === focusMeeting.contact_id) ?? null
      : null;

  const focusBrief = meetingIdParam
    ? briefs.find((brief: any) => brief.meeting_id === meetingIdParam)
    : contactIdParam
      ? briefs.find((brief: any) => brief.contact_id === contactIdParam)
      : null;

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#d7d0c3] bg-[#fffbf4] p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">
          Prep
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Briefs and stories.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5f594f]">
          Prepare for a specific conversation, then keep your interview stories
          ready for later.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <PrepAiPreview contact={focusContact} meeting={focusMeeting} existingBrief={focusBrief} profile={profile} />
        <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="text-lg font-semibold">Meeting brief</h2>
          <p className="mt-1 text-sm text-[#6d665c]">
            Tie a brief to a meeting or contact. Re-open it later for thank-you context.
          </p>

          <form action={savePrepBrief} className="mt-5 space-y-4">
            <input type="hidden" name="meeting_id" value={focusMeeting?.id ?? ""} />
            <input type="hidden" name="contact_id" value={focusMeeting?.contact_id ?? contactIdParam ?? ""} />
            <label className="block">
              <span className="text-sm font-semibold">Title</span>
              <input
                name="title"
                defaultValue={focusBrief?.title ?? focusMeeting?.title ?? "Prep brief"}
                className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">About them</span>
                <textarea name="about_them" defaultValue={focusBrief?.about_them ?? ""} rows={4} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Company context</span>
                <textarea name="company_context" defaultValue={focusBrief?.company_context ?? ""} rows={4} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Your pitch</span>
              <textarea name="your_pitch" defaultValue={focusBrief?.your_pitch ?? ""} rows={4} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Questions to ask</span>
              <textarea
                name="questions_to_ask"
                defaultValue={(focusBrief?.questions_to_ask ?? []).join("\n")}
                rows={5}
                className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Goal for call</span>
                <input name="goal_for_call" defaultValue={focusBrief?.goal_for_call ?? ""} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Follow-up notes</span>
                <input name="follow_up_notes" defaultValue={focusBrief?.follow_up_notes ?? ""} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
            </div>
            <SubmitButton label="Save brief" pendingLabel="Saving..." />
          </form>
        </section>
        </div>

        <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="text-lg font-semibold">Add meeting</h2>
          <form action={createMeeting} className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold">Contact</span>
              <select name="contact_id" defaultValue={contactIdParam ?? ""} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2">
                <option value="">Select a contact</option>
                {contacts.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.company?.name ? ` · ${contact.company.name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">When</span>
              <input name="scheduled_for" type="datetime-local" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Type</span>
              <select name="meeting_type" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2">
                <option value="coffee_chat">Coffee chat</option>
                <option value="call">Call</option>
                <option value="interview">Interview</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Title</span>
              <input name="title" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Notes</span>
              <textarea name="notes" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <SubmitButton label="Add meeting" pendingLabel="Saving..." variant="secondary" />
          </form>
        </section>
      </div>

      <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
        <h2 className="text-lg font-semibold">Upcoming meetings</h2>
        <div className="mt-4 divide-y divide-[#e3dacc]">
          {meetings.length === 0 ? (
            <p className="py-4 text-sm text-[#6d665c]">No meetings yet.</p>
          ) : (
            meetings.map((meeting: any) => (
              <div key={meeting.id} className="grid gap-3 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold">{meeting.title ?? meeting.contact?.name ?? "Meeting"}</p>
                  <p className="mt-1 text-sm text-[#6d665c]">
                    {meeting.contact?.name ?? "Contact"} · {formatDateTime(meeting.scheduled_for)}
                  </p>
                </div>
                <Link
                  href={`/app/prep?contact_id=${meeting.contact_id}&meeting_id=${meeting.id}`}
                  className="self-start text-sm font-medium text-[#1f6f68]"
                >
                  Open brief
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
        <h2 className="text-lg font-semibold">Behavioral stories</h2>
        <p className="mt-1 text-sm text-[#6d665c]">
          Keep a small library of STAR stories the interview prep mode can reuse.
        </p>
        <form action={createBehavioralStory} className="mt-5 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Title</span>
              <input name="title" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Tags</span>
              <input name="tags" placeholder="leadership, conflict, ambiguity" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Situation</span>
              <textarea name="situation" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Task</span>
              <textarea name="task" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Action</span>
              <textarea name="action" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Result</span>
              <textarea name="result" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-semibold">Notes</span>
            <textarea name="notes" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="favorite" />
            Favorite
          </label>
          <SubmitButton label="Save story" pendingLabel="Saving..." />
        </form>

        <div className="mt-6 grid gap-3">
          {stories.length === 0 ? (
            <p className="text-sm text-[#6d665c]">No stories yet.</p>
          ) : (
            stories.map((story: any) => (
              <article key={story.id} className="rounded-2xl border border-[#e3dacc] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{story.title}</h3>
                  {story.favorite ? (
                    <span className="rounded-full bg-[#e5f0ee] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                      Favorite
                    </span>
                  ) : null}
                </div>
                {story.tags?.length ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[#6d665c]">
                    {story.tags.join(" · ")}
                  </p>
                ) : null}
                {story.result ? <p className="mt-3 text-sm text-[#4b463d]">{story.result}</p> : null}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
