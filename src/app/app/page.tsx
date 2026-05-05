import Link from "next/link";
import { createCompany, createContact, completeOnboarding } from "@/app/app/actions";
import { SubmitButton } from "@/app/app/form-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type FeedItem = {
  title: string;
  detail: string;
  actionLabel: string;
  href: string;
  tone: "critical" | "warm" | "quiet";
};

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function daysSince(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

export default async function NetworkHomePage() {
  const supabase = await createSupabaseServerClient();

  const [
    { data: profile },
    { data: companiesData },
    { data: contactsData },
    { data: messagesData },
    { data: interactionsData },
    { data: meetingsData },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").maybeSingle(),
    supabase
      .from("companies")
      .select("id, name, notes, is_target, target_roles, updated_at, last_researched_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("contacts")
      .select("id, name, role, stage, notes, last_interaction_at, company_id, company:companies(id, name, is_target)")
      .order("updated_at", { ascending: false }),
    supabase
      .from("messages")
      .select("id, contact_id, direction, status, subject, body, sent_at, received_at, created_at, source")
      .order("created_at", { ascending: false }),
    supabase
      .from("interactions")
      .select("id, contact_id, type, occurred_at, summary")
      .order("occurred_at", { ascending: false }),
    supabase
      .from("meetings")
      .select("id, contact_id, company_id, meeting_type, scheduled_for, title, status, completed_at")
      .order("scheduled_for", { ascending: true }),
  ]);

  const profileRow = (profile ?? {}) as any;
  const companies = companiesData ?? [];
  const contacts = contactsData ?? [];
  const messages = messagesData ?? [];
  const interactions = interactionsData ?? [];
  const meetings = meetingsData ?? [];

  const contactsById = new Map<string, any>();
  contacts.forEach((contact: any) => contactsById.set(contact.id, contact));

  const companyById = new Map<string, any>();
  companies.forEach((company: any) => companyById.set(company.id, company));

  const latestEventForContact = (contactId: string) => {
    const outbound = messages.find(
      (message: any) =>
        message.contact_id === contactId &&
        message.direction === "outbound" &&
        message.status === "sent",
    );
    const inbound = messages.find(
      (message: any) =>
        message.contact_id === contactId &&
        message.direction === "inbound" &&
        message.status === "received",
    );
    const interaction = interactions.find((item: any) => item.contact_id === contactId);
    const meeting = meetings.find((item: any) => item.contact_id === contactId);

    return [
      outbound?.sent_at ?? outbound?.created_at ?? null,
      inbound?.received_at ?? inbound?.created_at ?? null,
      interaction?.occurred_at ?? null,
      meeting?.completed_at ?? meeting?.scheduled_for ?? null,
    ]
      .filter(Boolean)
      .sort()
      .at(-1) as string | null | undefined;
  };

  const feed: FeedItem[] = [];

  for (const contact of contacts as any[]) {
    const latestInbound = messages.find(
      (message: any) =>
        message.contact_id === contact.id &&
        message.direction === "inbound" &&
        message.status === "received",
    );
    const latestOutbound = messages.find(
      (message: any) =>
        message.contact_id === contact.id &&
        message.direction === "outbound" &&
        message.status === "sent",
    );

    const inboundAt = toDate(latestInbound?.received_at ?? latestInbound?.created_at);
    const outboundAt = toDate(latestOutbound?.sent_at ?? latestOutbound?.created_at);

    if (inboundAt && (!outboundAt || inboundAt > outboundAt)) {
      feed.push({
        title: contact.name,
        detail: latestInbound?.body?.slice(0, 120) ?? "They replied.",
        actionLabel: "Open thread",
        href: `/app/contacts/${contact.id}`,
        tone: "critical",
      });
      continue;
    }

    const upcomingMeeting = meetings.find(
      (meeting: any) =>
        meeting.contact_id === contact.id &&
        meeting.status === "scheduled" &&
        toDate(meeting.scheduled_for) &&
        (toDate(meeting.scheduled_for)?.getTime() ?? 0) - Date.now() <= 24 * 60 * 60 * 1000 &&
        (toDate(meeting.scheduled_for)?.getTime() ?? 0) >= Date.now(),
    );

    if (upcomingMeeting) {
      feed.push({
        title: contact.name,
        detail: `Meeting tomorrow at ${new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit",
        }).format(toDate(upcomingMeeting.scheduled_for) as Date)}`,
        actionLabel: "Open prep",
        href: `/app/prep?contact_id=${contact.id}&meeting_id=${upcomingMeeting.id}`,
        tone: "warm",
      });
      continue;
    }

    const latestTouch = latestEventForContact(contact.id);
    const daysSilent = daysSince(latestTouch);
    if (daysSilent !== null && daysSilent >= 14) {
      feed.push({
        title: contact.name,
        detail: `Silent for ${daysSilent} days.`,
        actionLabel: "Open thread",
        href: `/app/contacts/${contact.id}`,
        tone: "quiet",
      });
    }
  }

  const thankYouDue: FeedItem[] = [];
  for (const meeting of meetings as any[]) {
    if (meeting.status !== "completed") continue;
    const completedAt = toDate(meeting.completed_at ?? meeting.scheduled_for);
    if (!completedAt) continue;
    const contact = contactsById.get(meeting.contact_id);
    const latestOutbound = messages.find(
      (message: any) =>
        message.contact_id === meeting.contact_id &&
        message.direction === "outbound" &&
        message.status === "sent" &&
        toDate(message.sent_at ?? message.created_at) &&
        (toDate(message.sent_at ?? message.created_at)?.getTime() ?? 0) > completedAt.getTime(),
    );
    if (!latestOutbound && daysSince(completedAt) !== null && daysSince(completedAt)! >= 5) {
      thankYouDue.push({
        title: contact?.name ?? "Meeting follow-up",
        detail: "Thank-you follow-up is due.",
        actionLabel: "Open prep",
        href: `/app/prep?contact_id=${meeting.contact_id}&meeting_id=${meeting.id}`,
        tone: "warm",
      });
    }
  }

  const untouchedCompanies: FeedItem[] = [];
  for (const company of companies as any[]) {
    const companyContacts = contacts.filter((contact: any) => contact.company_id === company.id);
    if (companyContacts.length === 0) continue;

    const hasOutbound = companyContacts.some((contact: any) =>
      messages.some(
        (message: any) =>
          message.contact_id === contact.id &&
          message.direction === "outbound" &&
          message.status === "sent",
      ),
    );

    if (!hasOutbound) {
      const firstContact = (companyContacts[0] as any) ?? null;
      untouchedCompanies.push({
        title: company.name,
        detail: `${companyContacts.length} contact${companyContacts.length === 1 ? "" : "s"} and no outreach yet.`,
        actionLabel: "Start outreach",
        href: firstContact ? `/app/contacts/${firstContact.id}` : "/app",
        tone: "quiet",
      });
    }
  }

  const companySignals = companyMomentumSignals(contacts, companyById, messages, interactions);
  const sortedFeed = [
    ...feed.filter((item) => item.tone === "critical"),
    ...thankYouDue,
    ...feed.filter((item) => item.tone === "warm"),
    ...feed.filter((item) => item.tone === "quiet"),
    ...untouchedCompanies.slice(0, 3),
  ].slice(0, 6);

  const onboardingComplete = Boolean(profileRow.onboarding_completed_at);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[#d7d0c3] bg-gradient-to-br from-[#fffbf4] via-[#f5efe5] to-[#efe6d6] p-6 shadow-[0_24px_80px_rgba(41,37,31,0.08)] md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1f6f68]">
            Network
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
            What needs attention right now.
          </h1>
        </div>

        {!onboardingComplete ? (
          <form
            action={completeOnboarding}
            className="rounded-[28px] border border-[#d7d0c3] bg-[#fffbf4] p-6"
          >
            <h2 className="text-lg font-semibold">First-run setup</h2>
            <p className="mt-2 text-sm leading-6 text-[#6d665c]">
              Paste the basics once and start with a draft immediately.
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold">Your name</span>
                <input name="full_name" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Resume</span>
                <textarea name="resume_text" rows={4} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Current situation</span>
                <textarea name="current_situation" rows={2} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Target company</span>
                <input name="company_name" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Contact name</span>
                <input name="contact_name" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Contact role</span>
                <input name="contact_role" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Voice sample 1</span>
                <textarea name="voice_sample_1" rows={2} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Voice sample 2</span>
                <textarea name="voice_sample_2" rows={2} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Voice sample 3</span>
                <textarea name="voice_sample_3" rows={2} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2" />
              </label>
            </div>
            <SubmitButton
              label="Create first draft"
              pendingLabel="Setting up..."
              variant="primary"
            />
          </form>
        ) : (
          <div className="rounded-[28px] border border-[#d7d0c3] bg-[#fffbf4] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Quick add</h2>
              <span className="rounded-full bg-[#e5f0ee] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                Ready
              </span>
            </div>
            <div className="mt-5 grid gap-4">
              <form action={createCompany} className="space-y-3 rounded-2xl border border-[#e3dacc] bg-white p-4">
                <p className="text-sm font-semibold">Add company</p>
                <input name="name" placeholder="Company name" className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
                <textarea name="notes" placeholder="Notes" rows={2} className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="is_target" />
                  Mark as target
                </label>
                <SubmitButton label="Add company" pendingLabel="Adding..." variant="secondary" />
              </form>

              <form action={createContact} className="space-y-3 rounded-2xl border border-[#e3dacc] bg-white p-4">
                <p className="text-sm font-semibold">Add contact</p>
                <input name="name" placeholder="Contact name" className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
                <input name="company_name" placeholder="Company" className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
                <input name="role" placeholder="Role" className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
                <SubmitButton label="Add contact" pendingLabel="Adding..." variant="secondary" />
              </form>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Today</h2>
          </div>
          <p className="text-sm text-[#6d665c]">{sortedFeed.length} signal{sortedFeed.length === 1 ? "" : "s"}</p>
        </div>

        {sortedFeed.length === 0 ? (
          <div className="rounded-2xl border border-[#d7d0c3] bg-[#fffbf4] p-6 text-sm text-[#6d665c]">
            All quiet. Nothing urgent right now.
          </div>
        ) : (
          <div className="grid gap-3">
            {sortedFeed.map((item) => (
              <Link
                key={`${item.title}-${item.href}`}
                href={item.href}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#d7d0c3] bg-[#fffbf4] p-5 transition hover:border-[#8f8574] hover:bg-[#f8f1e7]"
              >
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-[#6d665c]">{item.detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#1f6f68] px-3 py-1 text-xs font-semibold text-white">
                  {item.actionLabel}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Companies</h2>
        </div>
        <div className="grid gap-3">
          {companies.length === 0 ? (
            <div className="rounded-2xl border border-[#d7d0c3] bg-[#fffbf4] p-6 text-sm text-[#6d665c]">
              No companies yet.
            </div>
          ) : (
            companies.map((company: any) => {
              const companyContacts = contacts.filter((contact: any) => contact.company_id === company.id);
              const momentum = companySignals.get(company.id) ?? "Quiet";
              return (
                <div
                  key={company.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#d7d0c3] bg-[#fffbf4] p-5"
                >
                  <div>
                    <p className="font-semibold">{company.name}</p>
                    <p className="mt-1 text-sm text-[#6d665c]">
                      {companyContacts.length} contact{companyContacts.length === 1 ? "" : "s"} · {momentum}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {company.is_target ? (
                      <span className="rounded-full bg-[#e5f0ee] px-3 py-1 text-xs font-semibold text-[#1f6f68]">
                        Target
                      </span>
                    ) : null}
                    <Link href="/app/profile" className="text-sm font-medium text-[#1f6f68]">
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function companyMomentumSignals(
  contacts: any[],
  companyById: Map<string, any>,
  messages: any[],
  interactions: any[],
) {
  const map = new Map<string, string>();
  for (const company of companyById.values()) {
    const companyContacts = contacts.filter((contact) => contact.company_id === company.id);
    if (companyContacts.length === 0) continue;

    const latest = companyContacts
      .map((contact) => {
        const messageDates = messages
          .filter((message) => message.contact_id === contact.id)
          .map((message) => toDate(message.sent_at ?? message.received_at ?? message.created_at))
          .filter((value): value is Date => Boolean(value));
        const interactionDates = interactions
          .filter((interaction) => interaction.contact_id === contact.id)
          .map((interaction) => toDate(interaction.occurred_at))
          .filter((value): value is Date => Boolean(value));
        return [...messageDates, ...interactionDates].sort((a, b) => a.getTime() - b.getTime()).at(-1);
      })
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    if (!latest) {
      map.set(company.id, "Quiet");
      continue;
    }

    const days = daysSince(latest);
    if (days !== null && days <= 7) map.set(company.id, "Active");
    else if (days !== null && days <= 21) map.set(company.id, "Warm");
    else map.set(company.id, "Cooling");
  }
  return map;
}
