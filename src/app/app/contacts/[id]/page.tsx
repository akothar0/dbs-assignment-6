import { notFound } from "next/navigation";
import {
  completeTask,
  createTask,
  dismissTask,
  logInteraction,
  updateContactStage,
} from "@/app/app/actions";
import {
  formatDate,
  formatInteractionType,
  formatStage,
  interactionTypes,
  pipelineStages,
} from "@/lib/crm";
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
  const { data: interactionsData } = await supabase
    .from("interactions")
    .select("*")
    .eq("contact_id", id)
    .order("occurred_at", { ascending: false });
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .eq("contact_id", id)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (!contact) {
    notFound();
  }

  const interactions = interactionsData ?? [];
  const tasks = tasksData ?? [];
  const openTasks = tasks.filter((task) => task.status === "open");

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

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Log interaction</h2>
          <form action={logInteraction} className="mt-4 space-y-4">
            <input type="hidden" name="contact_id" value={contact.id} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold">Type</span>
                <select
                  name="type"
                  className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                >
                  {interactionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Occurred at</span>
                <input
                  type="datetime-local"
                  name="occurred_at"
                  className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Summary</span>
              <input
                required
                name="summary"
                placeholder="What happened?"
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Raw notes</span>
              <textarea
                name="raw_notes"
                rows={4}
                className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
              />
            </label>
            <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
              Save interaction
            </button>
          </form>
        </div>

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Tasks</h2>
          <form action={createTask} className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="contact_id" value={contact.id} />
            <input
              required
              name="title"
              placeholder="Task"
              className="rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
            <input
              type="datetime-local"
              name="due_at"
              className="rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
            />
            <button className="rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]">
              Add task
            </button>
          </form>

          <div className="mt-5 divide-y divide-[#e3dacc]">
            {openTasks.length === 0 ? (
              <p className="py-3 text-sm text-[#6d665c]">No open tasks.</p>
            ) : (
              openTasks.map((task) => (
                <div
                  key={task.id}
                  className="grid gap-3 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-[#6d665c]">
                      Due {formatDate(task.due_at)} · {task.source}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={completeTask}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <button className="rounded-md border border-[#c9c0b2] px-3 py-2 text-sm font-semibold">
                        Complete
                      </button>
                    </form>
                    <form action={dismissTask}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <button className="rounded-md border border-[#c9c0b2] px-3 py-2 text-sm font-semibold">
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Timeline</h2>
          <div className="mt-4 divide-y divide-[#e3dacc]">
            {interactions.length === 0 ? (
              <p className="py-3 text-sm text-[#6d665c]">
                No interactions logged yet.
              </p>
            ) : (
              interactions.map((interaction) => (
                <article key={interaction.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">
                      {formatInteractionType(interaction.type)}
                    </p>
                    <p className="text-sm text-[#6d665c]">
                      {formatDate(interaction.occurred_at)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#4b463d]">
                    {interaction.summary}
                  </p>
                  {interaction.raw_notes ? (
                    <p className="mt-2 text-sm leading-6 text-[#6d665c]">
                      {interaction.raw_notes}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
