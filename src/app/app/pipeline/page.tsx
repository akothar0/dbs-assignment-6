import Link from "next/link";
import { pipelineStages } from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function PipelinePage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, name, company, role, stage")
    .order("updated_at", { ascending: false });
  const contacts = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-2 text-[#6d665c]">
          Scan relationship stages across the contacts supporting your broader
          recruiting search.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {pipelineStages.map((stage) => {
          const stageContacts = contacts.filter(
            (contact) => contact.stage === stage.value,
          );

          return (
          <section
            key={stage.value}
            className="min-h-32 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-4"
          >
            <h2 className="text-sm font-semibold">{stage.label}</h2>
            <p className="mt-1 text-sm text-[#6d665c]">
              {stageContacts.length} contacts
            </p>
            <div className="mt-4 space-y-2">
              {stageContacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/app/contacts/${contact.id}`}
                  className="block rounded-md border border-[#e3dacc] bg-white px-3 py-2 text-sm transition hover:border-[#1f6f68]"
                >
                  <span className="font-semibold">{contact.name}</span>
                  <span className="mt-1 block text-[#6d665c]">
                    {contact.company ?? contact.role ?? "No company"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}
