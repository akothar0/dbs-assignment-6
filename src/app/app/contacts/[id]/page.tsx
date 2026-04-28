import { notFound } from "next/navigation";
import {
  acceptAiSuggestion,
  completeTask,
  createTask,
  dismissAiSuggestion,
  dismissTask,
  generateDraft,
  logInteraction,
  updateContactStage,
  updateTask,
} from "@/app/app/actions";
import { PendingFieldset, SubmitButton } from "@/app/app/form-controls";
import { TaskSourceChip, TaskStatusChip } from "@/app/app/task-ui";
import {
  formatApplicationStatus,
  draftGoals,
  formatDate,
  formatDraftGoal,
  formatPrepItemType,
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
  const { data: draftsData } = await supabase
    .from("message_drafts")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(5);
  const { data: suggestionsData } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("contact_id", id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const { data: applicationsData } = await supabase
    .from("applications")
    .select("*")
    .eq("contact_id", id)
    .order("updated_at", { ascending: false });
  const { data: prepData } = await supabase
    .from("prep_items")
    .select("*")
    .eq("contact_id", id)
    .order("updated_at", { ascending: false })
    .limit(6);

  if (!contact) {
    notFound();
  }

  const interactions = interactionsData ?? [];
  const tasks = tasksData ?? [];
  const drafts = draftsData ?? [];
  const suggestions = suggestionsData ?? [];
  const applications = applicationsData ?? [];
  const prepItems = prepData ?? [];
  const openTasks = tasks.filter((task) => task.status === "open");
  const closedTasks = tasks.filter((task) => task.status !== "open");
  const latestDraft = drafts[0];
  const draftHistory = drafts.slice(1);

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

        {applications.length > 0 || prepItems.length > 0 ? (
          <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
            <h2 className="font-semibold">Recruiting context</h2>
            {applications.length > 0 ? (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-semibold">Linked applications</h3>
                {applications.map((application) => (
                  <div
                    key={application.id}
                    className="rounded-md border border-[#e3dacc] bg-white p-3"
                  >
                    <p className="text-sm font-semibold">
                      {application.role} · {application.company}
                    </p>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      {formatApplicationStatus(application.status)} · Deadline{" "}
                      {formatDate(application.deadline)}
                    </p>
                    {application.next_step ? (
                      <p className="mt-2 text-sm text-[#4b463d]">
                        {application.next_step}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            {prepItems.length > 0 ? (
              <div className="mt-5 space-y-3">
                <h3 className="text-sm font-semibold">Recent prep</h3>
                {prepItems.map((item) => (
                  <div key={item.id} className="text-sm">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-[#6d665c]">
                      {formatPrepItemType(item.type)} · Due{" "}
                      {formatDate(item.due_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">AI outreach draft</h2>
          <p className="mt-1 text-sm text-[#6d665c]">
            Generates an editable draft and saves it below in Draft history.
          </p>
          <form action={generateDraft} className="mt-4 space-y-4">
            <input type="hidden" name="contact_id" value={contact.id} />
            <PendingFieldset className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold">Goal</span>
                  <select
                    name="goal"
                    className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                  >
                    {draftGoals.map((goal) => (
                      <option key={goal.value} value={goal.value}>
                        {goal.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold">Extra direction</span>
                  <input
                    name="instructions"
                    placeholder="Tone, ask, context to include"
                    className="mt-2 w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                  />
                </label>
              </div>
              <SubmitButton
                label="Generate draft"
                pendingDescription="Request received. Rolo is writing and saving the draft."
                pendingLabel="Generating draft..."
              />
            </PendingFieldset>
          </form>

          {latestDraft ? (
            <div className="mt-5 border-t border-[#e3dacc] pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">Latest draft</h3>
                <span className="rounded-md bg-[#e5f0ee] px-2 py-1 text-xs font-semibold text-[#1f6f68]">
                  Saved to Draft history
                </span>
              </div>
              <article className="mt-3 rounded-md border border-[#e3dacc] bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {formatDraftGoal(latestDraft.goal)}
                  </p>
                  <p className="text-sm text-[#6d665c]">
                    {formatDate(latestDraft.created_at)}
                  </p>
                </div>
                {latestDraft.subject ? (
                  <p className="mt-2 text-sm font-semibold">
                    {latestDraft.subject}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
                  {latestDraft.body}
                </p>
                {latestDraft.personalization_signals.length > 0 ? (
                  <p className="mt-3 text-xs leading-5 text-[#6d665c]">
                    Signals used:{" "}
                    {latestDraft.personalization_signals.join(", ")}
                  </p>
                ) : null}
              </article>
            </div>
          ) : (
            <p className="mt-5 border-t border-[#e3dacc] pt-4 text-sm text-[#6d665c]">
              No drafts generated yet. The next generated draft will appear here
              and in Draft history.
            </p>
          )}

          {suggestions.length > 0 ? (
            <div className="mt-5 space-y-3 border-t border-[#e3dacc] pt-4">
              <h3 className="text-sm font-semibold">Pending AI suggestions</h3>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-md border border-[#e3dacc] bg-white p-3"
                >
                  <p className="text-sm leading-6 text-[#4b463d]">
                    {suggestion.reasoning ?? "Review suggested next steps."}
                  </p>
                  {suggestion.suggested_stage ? (
                    <p className="mt-2 text-sm text-[#6d665c]">
                      Stage: {formatStage(suggestion.suggested_stage)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex gap-2">
                    <form action={acceptAiSuggestion}>
                      <input
                        type="hidden"
                        name="suggestion_id"
                        value={suggestion.id}
                      />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <SubmitButton
                        label="Accept"
                        pendingLabel="Accepting..."
                      />
                    </form>
                    <form action={dismissAiSuggestion}>
                      <input
                        type="hidden"
                        name="suggestion_id"
                        value={suggestion.id}
                      />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <SubmitButton
                        label="Dismiss"
                        pendingLabel="Dismissing..."
                        variant="secondary"
                      />
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {draftHistory.length > 0 ? (
            <div className="mt-5 divide-y divide-[#e3dacc] border-t border-[#e3dacc] pt-4">
              <h3 className="pb-2 text-sm font-semibold">Draft history</h3>
              {draftHistory.map((draft) => (
                <article key={draft.id} className="py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{formatDraftGoal(draft.goal)}</p>
                    <p className="text-sm text-[#6d665c]">
                      {formatDate(draft.created_at)}
                    </p>
                  </div>
                  {draft.subject ? (
                    <p className="mt-2 text-sm font-semibold">
                      {draft.subject}
                    </p>
                  ) : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
                    {draft.body}
                  </p>
                </article>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Log interaction</h2>
          <div className="mt-3 rounded-md border border-[#e3dacc] bg-white p-3 text-sm text-[#6d665c]">
            <p className="font-semibold text-[#171512]">
              Auto-created task rules
            </p>
            <p className="mt-1 leading-6">
              Coffee chats create thank-you and reconnect tasks. Email and
              LinkedIn create follow-up tasks. Calls and coffee chats create
              reconnect tasks.
            </p>
          </div>
          <form action={logInteraction} className="mt-4 space-y-4">
            <input type="hidden" name="contact_id" value={contact.id} />
            <PendingFieldset className="space-y-4">
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
              <SubmitButton
                label="Save interaction"
                pendingLabel="Saving interaction..."
              />
            </PendingFieldset>
          </form>
        </div>

        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <h2 className="font-semibold">Tasks</h2>
          <form action={createTask} className="mt-4">
            <input type="hidden" name="contact_id" value={contact.id} />
            <PendingFieldset className="grid gap-3 md:grid-cols-[1fr_auto]">
              <div className="grid gap-3 md:grid-cols-2">
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
                <textarea
                  name="description"
                  placeholder="Details"
                  rows={2}
                  className="rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68] md:col-span-2"
                />
              </div>
              <SubmitButton
                className="self-start"
                label="Add task"
                pendingLabel="Adding task..."
              />
            </PendingFieldset>
          </form>

          <div className="mt-5 divide-y divide-[#e3dacc]">
            {openTasks.length === 0 ? (
              <p className="py-3 text-sm text-[#6d665c]">
                No open tasks for this contact.
              </p>
            ) : (
              openTasks.map((task) => (
                <div
                  key={task.id}
                  className="grid gap-3 py-3 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      <TaskSourceChip source={task.source} />
                    </div>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      Due {formatDate(task.due_at)}
                    </p>
                    {task.description ? (
                      <p className="mt-2 text-sm leading-6 text-[#4b463d]">
                        {task.description}
                      </p>
                    ) : null}
                    <details className="mt-3 rounded-md border border-[#e3dacc] bg-white p-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[#1f6f68]">
                        Edit
                      </summary>
                      <form action={updateTask} className="mt-3 space-y-3">
                        <input type="hidden" name="task_id" value={task.id} />
                        <input
                          type="hidden"
                          name="contact_id"
                          value={contact.id}
                        />
                        <input
                          required
                          name="title"
                          defaultValue={task.title}
                          className="w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                        />
                        <input
                          type="datetime-local"
                          name="due_at"
                          defaultValue={toDateTimeLocal(task.due_at)}
                          className="w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                        />
                        <textarea
                          name="description"
                          defaultValue={task.description ?? ""}
                          rows={3}
                          className="w-full rounded-md border border-[#c9c0b2] bg-white px-3 py-2 text-sm outline-none focus:border-[#1f6f68]"
                        />
                        <SubmitButton
                          label="Save changes"
                          pendingLabel="Saving changes..."
                        />
                      </form>
                    </details>
                  </div>
                  <div className="flex flex-wrap gap-2 self-start md:self-center">
                    <form action={completeTask}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <SubmitButton
                        label="Complete"
                        pendingLabel="Completing..."
                        variant="secondary"
                      />
                    </form>
                    <form action={dismissTask}>
                      <input type="hidden" name="task_id" value={task.id} />
                      <input
                        type="hidden"
                        name="contact_id"
                        value={contact.id}
                      />
                      <SubmitButton
                        label="Dismiss"
                        pendingLabel="Dismissing..."
                        variant="secondary"
                      />
                    </form>
                  </div>
                </div>
              ))
            )}
          </div>

          {closedTasks.length > 0 ? (
            <details className="mt-4 border-t border-[#e3dacc] pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-[#5f594f]">
                Completed / dismissed ({closedTasks.length})
              </summary>
              <div className="mt-3 divide-y divide-[#e3dacc]">
                {closedTasks.map((task) => (
                  <div key={task.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{task.title}</p>
                      <TaskStatusChip status={task.status} />
                      <TaskSourceChip source={task.source} />
                    </div>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      Due {formatDate(task.due_at)}
                    </p>
                    {task.description ? (
                      <p className="mt-2 text-sm leading-6 text-[#4b463d]">
                        {task.description}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </details>
          ) : null}
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

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return offsetDate.toISOString().slice(0, 16);
}
