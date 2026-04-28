import {
  createApplication,
  updateApplicationStatus,
} from "@/app/app/actions";
import {
  applicationStatuses,
  formatApplicationStatus,
  formatDate,
} from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ApplicationsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: applicationsData }, { data: contactsData }] =
    await Promise.all([
      supabase
        .from("applications")
        .select("*, contacts(id, name, company)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("contacts")
        .select("id, name, company")
        .order("name", { ascending: true }),
    ]);

  const applications = applicationsData ?? [];
  const contacts = contactsData ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[0.62fr_1fr]">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">
          Applications
        </h1>
        <p className="mt-2 text-[#6d665c]">
          Track target roles, referrals, deadlines, status, and the next action
          attached to each opportunity.
        </p>

        <form
          action={createApplication}
          className="mt-6 space-y-4 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Company</span>
              <input
                required
                name="company"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Role</span>
              <input
                required
                name="role"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Status</span>
              <select
                name="status"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              >
                {applicationStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Referral/contact</span>
              <select
                name="contact_id"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              >
                <option value="none">No linked contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Source</span>
              <input
                name="source"
                placeholder="Referral, campus, company site"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Deadline</span>
              <input
                type="date"
                name="deadline"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Next step</span>
            <input
              name="next_step"
              placeholder="Ask Priya about referral timing"
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Notes</span>
            <textarea
              name="notes"
              rows={4}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>

          <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
            Add application
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4]">
        <div className="border-b border-[#e3dacc] px-5 py-4">
          <h2 className="font-semibold">Tracked opportunities</h2>
          <p className="text-sm text-[#6d665c]">
            {applications.length} roles across target, active, and closed
            stages.
          </p>
        </div>
        {applications.length === 0 ? (
          <div className="p-5 text-sm text-[#6d665c]">
            No applications yet. Add the first role you are researching,
            pursuing, or interviewing for.
          </div>
        ) : (
          <div className="divide-y divide-[#e3dacc]">
            {applications.map((application) => (
              <article
                id={`application-${application.id}`}
                key={application.id}
                className="px-5 py-4"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="font-semibold">
                      {application.role} · {application.company}
                    </p>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      {formatApplicationStatus(application.status)} · Deadline{" "}
                      {formatDate(application.deadline)}
                    </p>
                    {application.contacts ? (
                      <p className="mt-2 text-sm text-[#6d665c]">
                        Linked contact: {application.contacts.name}
                      </p>
                    ) : null}
                    {application.next_step ? (
                      <p className="mt-3 text-sm font-medium text-[#1f6f68]">
                        Next: {application.next_step}
                      </p>
                    ) : null}
                    {application.notes ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
                        {application.notes}
                      </p>
                    ) : null}
                  </div>
                  <form action={updateApplicationStatus} className="flex gap-2">
                    <input
                      type="hidden"
                      name="application_id"
                      value={application.id}
                    />
                    <select
                      name="status"
                      defaultValue={application.status}
                      className="h-10 rounded-md border border-[#c9c0b2] bg-white px-3 text-sm outline-none focus:border-[#1f6f68]"
                    >
                      {applicationStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <button className="h-10 rounded-md border border-[#c9c0b2] px-3 text-sm font-semibold">
                      Save
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
