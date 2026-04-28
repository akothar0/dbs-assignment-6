import Link from "next/link";
import { completeTask, dismissTask } from "@/app/app/actions";
import { formatDate } from "@/lib/crm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default function TodayPage() {
  return <TodayContent />;
}

async function TodayContent() {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("full_name, target_roles, target_companies, onboarding_completed_at")
    .maybeSingle();
  const { count: contactCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });
  const { count: activeApplicationCount } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .in("status", ["target", "applied", "interviewing"]);
  const { count: openPrepCount } = await supabase
    .from("prep_items")
    .select("*", { count: "exact", head: true })
    .is("completed_at", null);
  const { data: upcomingApplications } = await supabase
    .from("applications")
    .select("company, role, deadline, next_step")
    .not("deadline", "is", null)
    .order("deadline", { ascending: true })
    .limit(4);
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*, contacts(id, name, company)")
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false });
  const tasks = tasksData ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Today&apos;s queue
        </h1>
        <p className="mt-2 text-[#6d665c]">
          A focused command center for relationships, applications, prep, and
          next actions.
        </p>
      </div>

      {!profile?.onboarding_completed_at ? (
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="font-semibold">Finish your recruiting profile</p>
          <p className="mt-2 text-sm leading-6 text-[#6d665c]">
            Add your background and target roles before drafting outreach.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-4 inline-flex rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]"
          >
            Complete profile
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Contacts tracked</p>
          <p className="mt-3 text-3xl font-semibold">{contactCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Active applications</p>
          <p className="mt-3 text-3xl font-semibold">
            {activeApplicationCount ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Open prep items</p>
          <p className="mt-3 text-3xl font-semibold">{openPrepCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-5">
          <p className="text-sm text-[#6d665c]">Target roles</p>
          <p className="mt-3 text-xl font-semibold">
            {profile?.target_roles.length ? profile.target_roles.length : 0}
          </p>
        </div>
      </div>

      {upcomingApplications?.length ? (
        <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4]">
          <div className="border-b border-[#e3dacc] px-5 py-4">
            <h2 className="font-semibold">Upcoming application deadlines</h2>
            <p className="text-sm text-[#6d665c]">
              Near-term role deadlines and next steps.
            </p>
          </div>
          <div className="divide-y divide-[#e3dacc]">
            {upcomingApplications.map((application) => (
              <div
                key={`${application.company}-${application.role}-${application.deadline}`}
                className="grid gap-2 px-5 py-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">
                    {application.role} · {application.company}
                  </p>
                  {application.next_step ? (
                    <p className="mt-1 text-sm text-[#6d665c]">
                      {application.next_step}
                    </p>
                  ) : null}
                </div>
                <p className="self-center text-sm font-medium text-[#1f6f68]">
                  {formatDate(application.deadline)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4]">
        <div className="border-b border-[#e3dacc] px-5 py-4">
          <h2 className="font-semibold">Open actions</h2>
          <p className="text-sm text-[#6d665c]">
            Rule-generated and manual tasks sorted by due date.
          </p>
        </div>
        {tasks.length === 0 ? (
          <div className="p-8">
            <p className="font-medium">No actions yet</p>
            <p className="mt-2 text-sm leading-6 text-[#6d665c]">
              Log a coffee chat, email, LinkedIn message, or call to generate
              follow-up tasks.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#e3dacc]">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="mt-1 text-sm text-[#6d665c]">
                    Due {formatDate(task.due_at)} · {task.source}
                  </p>
                  {task.contacts ? (
                    <Link
                      href={`/app/contacts/${task.contacts.id}`}
                      className="mt-2 inline-flex text-sm font-medium text-[#1f6f68]"
                    >
                      {task.contacts.name}
                      {task.contacts.company ? ` · ${task.contacts.company}` : ""}
                    </Link>
                  ) : null}
                </div>
                <div className="flex gap-2 self-center">
                  <form action={completeTask}>
                    <input type="hidden" name="task_id" value={task.id} />
                    <input
                      type="hidden"
                      name="contact_id"
                      value={task.contact_id ?? ""}
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
                      value={task.contact_id ?? ""}
                    />
                    <button className="rounded-md border border-[#c9c0b2] px-3 py-2 text-sm font-semibold">
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
