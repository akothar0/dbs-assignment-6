import Link from "next/link";
import { createContact } from "@/app/app/actions";
import { formatStage, pipelineStages } from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function ContactsPage() {
  return <ContactsContent />;
}

async function ContactsContent() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("updated_at", { ascending: false });
  const contacts = data ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[0.65fr_1fr]">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-2 text-[#6d665c]">
          Track recruiting relationships and move each contact through the
          networking pipeline.
        </p>

        <form
          action={createContact}
          className="mt-6 space-y-4 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Name</span>
              <input
                required
                name="name"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Company</span>
              <input
                name="company"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Role</span>
              <input
                name="role"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Stage</span>
              <select
                name="stage"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              >
                {pipelineStages.map((stage) => (
                  <option key={stage.value} value={stage.value}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Level</span>
              <input
                name="level"
                placeholder="MBA alum, manager, partner"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <input
                name="email"
                type="email"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">How you know them</span>
            <input
              name="relationship"
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">LinkedIn URL</span>
            <input
              name="linkedin_url"
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Notes</span>
            <textarea
              name="notes"
              rows={3}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
          </label>

          <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
            Add contact
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4]">
        <div className="border-b border-[#e3dacc] px-5 py-4">
          <h2 className="font-semibold">All contacts</h2>
          <p className="text-sm text-[#6d665c]">{contacts.length} total</p>
        </div>
        {contacts.length === 0 ? (
          <div className="p-5 text-sm text-[#6d665c]">
            No contacts yet. Add the first person you want to follow up with.
          </div>
        ) : (
          <div className="divide-y divide-[#e3dacc]">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/app/contacts/${contact.id}`}
                className="grid gap-2 px-5 py-4 transition hover:bg-[#f4ede2] md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{contact.name}</p>
                  <p className="text-sm text-[#6d665c]">
                    {[contact.role, contact.company].filter(Boolean).join(" at ") ||
                      "No role or company"}
                  </p>
                </div>
                <p className="self-center text-sm font-medium text-[#1f6f68]">
                  {formatStage(contact.stage)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
