import { notFound } from "next/navigation";
import { updateContactStage } from "@/app/app/actions";
import { formatDate, formatStage, pipelineStages } from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (!contact) {
    notFound();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.7fr_1fr]">
      <section>
        <p className="text-sm font-semibold text-[#1f6f68]">
          {formatStage(contact.stage)}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {contact.name}
        </h1>
        <p className="mt-2 text-[#6d665c]">
          {[contact.role, contact.company].filter(Boolean).join(" at ") ||
            "No role or company"}
        </p>

        <form
          action={updateContactStage}
          className="mt-6 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5"
        >
          <input type="hidden" name="contact_id" value={contact.id} />
          <label className="block">
            <span className="text-sm font-semibold">Pipeline stage</span>
            <select
              name="stage"
              defaultValue={contact.stage}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            >
              {pipelineStages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>
          <button className="mt-4 rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
            Update stage
          </button>
        </form>
      </section>

      <section className="space-y-5">
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Contact context</h2>
          <dl className="mt-4 grid gap-4 text-sm md:grid-cols-2">
            <div>
              <dt className="font-semibold">Level</dt>
              <dd className="mt-1 text-[#6d665c]">{contact.level ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Email</dt>
              <dd className="mt-1 text-[#6d665c]">{contact.email ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="font-semibold">Relationship</dt>
              <dd className="mt-1 text-[#6d665c]">
                {contact.relationship ?? "Not set"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Last interaction</dt>
              <dd className="mt-1 text-[#6d665c]">
                {formatDate(contact.last_interaction_at)}
              </dd>
            </div>
          </dl>
          {contact.notes ? (
            <p className="mt-5 border-t border-[#e3dacc] pt-4 text-sm leading-6 text-[#4b463d]">
              {contact.notes}
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-dashed border-[#c9c0b2] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Timeline</h2>
          <p className="mt-2 text-sm text-[#6d665c]">
            Interaction logging and AI drafts are the next implementation slice.
          </p>
        </div>
      </section>
    </div>
  );
}
