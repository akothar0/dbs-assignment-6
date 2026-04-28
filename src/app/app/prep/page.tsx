import {
  captureContext,
  completePrepItem,
  createPrepItem,
  generatePrepBrief,
} from "@/app/app/actions";
import { PendingFieldset, SubmitButton } from "@/app/app/form-controls";
import { formatDate, formatPrepItemType, prepItemTypes } from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PrepPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: contactsData }, { data: applicationsData }, { data: prepData }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id, name, company, role")
        .order("name", { ascending: true }),
      supabase
        .from("applications")
        .select("id, company, role, status")
        .order("updated_at", { ascending: false }),
      supabase
        .from("prep_items")
        .select("*, contacts(id, name), applications(id, company, role)")
        .order("updated_at", { ascending: false }),
    ]);

  const contacts = contactsData ?? [];
  const applications = applicationsData ?? [];
  const prepItems = prepData ?? [];
  const openPrep = prepItems.filter((item) => !item.completed_at);
  const latestPrepBrief = prepItems.find((item) => item.type === "prep_brief");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Prep</h1>
        <p className="mt-2 max-w-3xl text-[#6d665c]">
          Build the working context behind the search: company notes, role
          talking points, interview prep, behavioral stories, and extracted
          next steps.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Add prep item</h2>
          <form action={createPrepItem} className="mt-4 space-y-4">
            <PendingFieldset className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold">Type</span>
                  <select
                    name="type"
                    className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                  >
                    {prepItemTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Due at</span>
                  <input
                    type="datetime-local"
                    name="due_at"
                    className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-semibold">Title</span>
                <input
                  required
                  name="title"
                  className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectContact contacts={contacts} />
                <SelectApplication applications={applications} />
              </div>

              <label className="block">
                <span className="text-sm font-semibold">Notes</span>
                <textarea
                  name="body"
                  rows={5}
                  className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                />
              </label>

              <SubmitButton
                label="Save prep"
                pendingLabel="Saving prep..."
              />
            </PendingFieldset>
          </form>
        </section>

        <section
          className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5"
          id="prep-generator"
        >
          <h2 className="font-semibold">AI prep brief</h2>
          <p className="mt-1 text-sm text-[#6d665c]">
            Generates a prep brief and saves it below in All prep.
          </p>
          <form action={generatePrepBrief} className="mt-4 space-y-4">
            <PendingFieldset className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <SelectContact contacts={contacts} />
                <SelectApplication applications={applications} />
              </div>
              <label className="block">
                <span className="text-sm font-semibold">Focus</span>
                <input
                  name="focus"
                  placeholder="Coffee chat with product lead, first-round interview, referral ask"
                  className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                />
              </label>
              <SubmitButton
                label="Generate prep brief"
                pendingDescription="Request received. Rolo is writing and saving the brief."
                pendingLabel="Generating brief..."
              />
            </PendingFieldset>
          </form>

          {latestPrepBrief ? (
            <div className="mt-5 border-t border-[#e3dacc] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">
                  Latest generated brief
                </h3>
                <span className="rounded-md bg-[#e5f0ee] px-2 py-1 text-xs font-semibold text-[#1f6f68]">
                  Saved to All prep
                </span>
              </div>
              <article className="mt-3 rounded-md border border-[#e3dacc] bg-white p-4">
                <p className="font-semibold">{latestPrepBrief.title}</p>
                <p className="mt-1 text-sm text-[#6d665c]">
                  {formatDate(latestPrepBrief.updated_at)}
                </p>
                {latestPrepBrief.body ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
                    {latestPrepBrief.body}
                  </p>
                ) : null}
              </article>
            </div>
          ) : (
            <p className="mt-5 border-t border-[#e3dacc] pt-4 text-sm text-[#6d665c]">
              No generated brief yet. The next generated brief will appear here
              and in All prep.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
        <h2 className="font-semibold">Capture context</h2>
        <p className="mt-1 text-sm text-[#6d665c]">
          Paste LinkedIn messages, email snippets, or raw notes to extract
          contacts, interaction summaries, tasks, and prep items.
        </p>
        <form action={captureContext} className="mt-4 space-y-4">
          <PendingFieldset className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectContact contacts={contacts} />
              <SelectApplication applications={applications} />
            </div>
            <textarea
              required
              name="raw_context"
              rows={6}
              placeholder="Paste the message thread, coffee chat notes, or role context here."
              className="w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
            <SubmitButton
              label="Extract context"
              pendingDescription="Request received. Rolo is extracting contacts, tasks, and prep."
              pendingLabel="Extracting context..."
            />
          </PendingFieldset>
        </form>
      </section>

      <section className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4]">
        <div className="border-b border-[#e3dacc] px-5 py-4">
          <h2 className="font-semibold">All prep</h2>
          <p className="text-sm text-[#6d665c]">
            {openPrep.length} open items, {prepItems.length} total.
          </p>
        </div>
        {prepItems.length === 0 ? (
          <div className="p-5 text-sm text-[#6d665c]">
            No prep saved yet. Add a prep item or generate a brief from your
            recruiting context.
          </div>
        ) : (
          <div className="divide-y divide-[#e3dacc]">
            {prepItems.map((item) => (
              <article key={item.id} className="px-5 py-4">
                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.title}</p>
                      {item.completed_at ? (
                        <span className="rounded-md bg-[#e5f0ee] px-2 py-1 text-xs font-semibold text-[#1f6f68]">
                          Complete
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      {formatPrepItemType(item.type)} · Due{" "}
                      {formatDate(item.due_at)}
                    </p>
                    {item.contacts ? (
                      <p className="mt-2 text-sm text-[#6d665c]">
                        Contact: {item.contacts.name}
                      </p>
                    ) : null}
                    {item.applications ? (
                      <p className="mt-1 text-sm text-[#6d665c]">
                        Role: {item.applications.role} ·{" "}
                        {item.applications.company}
                      </p>
                    ) : null}
                    {item.body ? (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
                        {item.body}
                      </p>
                    ) : null}
                  </div>
                  {!item.completed_at ? (
                    <form action={completePrepItem}>
                      <input
                        type="hidden"
                        name="prep_item_id"
                        value={item.id}
                      />
                      <SubmitButton
                        label="Complete"
                        pendingLabel="Completing..."
                        variant="secondary"
                      />
                    </form>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

type ContactOption = {
  id: string;
  name: string;
  company: string | null;
  role?: string | null;
};

type ApplicationOption = {
  id: string;
  company: string;
  role: string;
  status?: string;
};

function SelectContact({ contacts }: { contacts: ContactOption[] }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Contact</span>
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
  );
}

function SelectApplication({
  applications,
}: {
  applications: ApplicationOption[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">Application</span>
      <select
        name="application_id"
        className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
      >
        <option value="none">No linked application</option>
        {applications.map((application) => (
          <option key={application.id} value={application.id}>
            {application.role} · {application.company}
          </option>
        ))}
      </select>
    </label>
  );
}
