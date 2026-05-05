import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatLastTouch(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function ContactsPage() {
  const supabase = await createSupabaseServerClient();

  const { data: contactsData } = await supabase
    .from("contacts")
    .select("id, name, role, stage, last_interaction_at, company:companies(id, name)")
    .order("last_interaction_at", { ascending: false, nullsFirst: false });

  const contacts = contactsData ?? [];

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-[#d7d0c3] bg-[#fffbf4] p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">
          CONTACTS
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#171512] md:text-5xl">
          All contacts.
        </h1>
      </section>

      {contacts.length === 0 ? (
        <div className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5 text-sm text-[#6d665c]">
          No contacts yet. Add one from the Network page.
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: any) => (
            <Link
              key={contact.id}
              href={`/app/contacts/${contact.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5 transition hover:border-[#8f8574] hover:bg-[#f8f1e7]"
            >
              <div>
                <p className="font-semibold text-[#171512]">{contact.name}</p>
                <p className="mt-1 text-sm text-[#6d665c]">
                  {contact.role ?? "Unknown role"} · {contact.company?.name ?? "No company"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e5f0ee] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                  {(contact.stage ?? "unknown").replaceAll("_", " ")}
                </span>
                <span className="text-sm text-[#6d665c]">
                  {formatLastTouch(contact.last_interaction_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
