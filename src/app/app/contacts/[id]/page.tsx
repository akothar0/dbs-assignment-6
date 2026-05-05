import { notFound } from "next/navigation";
import { ContactThreadClient } from "@/app/app/contact-thread-client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ContactPageProps = {
  params: Promise<{ id: string }>;
};

type Suggestion = {
  subject: string;
  body: string;
  reason: string;
  goal: string;
  mode: "new" | "draft";
  messageId?: string | null;
};

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value: string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function formatFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || name.trim();
}

function buildStarterDraft({
  contact,
  company,
  profile,
}: {
  contact: any;
  company: any | null;
  profile: any;
}) {
  const firstName = formatFirstName(contact.name);
  const companyName = company?.name ?? "your company";
  const situation = profile?.current_situation?.trim() || "product recruiting";

  return {
    subject: `Quick intro`,
    body: [
      `Hi ${firstName},`,
      "",
      `I’m reaching out because I’m focused on ${situation} and your path at ${companyName} stood out.`,
      "I’d love to ask a couple of quick questions about your experience and what you’ve seen work well.",
      "",
      "If you’re open to it, I’d really appreciate 15 minutes.",
      "",
      "Best,",
      profile?.full_name?.trim() || "Me",
    ].join("\n"),
  };
}

function buildSuggestion({
  contact,
  company,
  profile,
  messages,
  interactions,
  meetings,
}: {
  contact: any;
  company: any | null;
  profile: any;
  messages: any[];
  interactions: any[];
  meetings: any[];
}): Suggestion {
  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date((b.sent_at ?? b.received_at ?? b.created_at) as string).getTime() -
      new Date((a.sent_at ?? a.received_at ?? a.created_at) as string).getTime(),
  );
  const latestDraft = sortedMessages.find(
    (message) => message.direction === "outbound" && message.status === "draft",
  );
  const latestInbound = sortedMessages.find(
    (message) => message.direction === "inbound" && message.status === "received",
  );
  const latestOutbound = sortedMessages.find(
    (message) => message.direction === "outbound" && message.status === "sent",
  );
  const latestInteraction = [...interactions]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .at(0);
  const latestMeeting = [...meetings]
    .sort(
      (a, b) =>
        new Date((b.completed_at ?? b.scheduled_for) as string).getTime() -
        new Date((a.completed_at ?? a.scheduled_for) as string).getTime(),
    )
    .at(0);

  const latestTouch = [
    latestDraft?.updated_at ?? latestDraft?.created_at,
    latestInbound?.received_at ?? latestInbound?.created_at,
    latestOutbound?.sent_at ?? latestOutbound?.created_at,
    latestInteraction?.occurred_at,
    latestMeeting?.completed_at ?? latestMeeting?.scheduled_for,
  ]
    .map(toDate)
    .filter(Boolean)
    .sort((a, b) => b!.getTime() - a!.getTime())[0];

  if (latestDraft) {
    return {
      subject: latestDraft.subject ?? "Quick intro",
      body: latestDraft.body,
      reason: "You already have a draft open. Tighten it before sending.",
      goal: latestDraft.goal ?? "cold_intro",
      mode: "draft",
      messageId: latestDraft.id,
    };
  }

  if (latestInbound && (!latestOutbound || toDate(latestInbound.received_at ?? latestInbound.created_at)! > toDate(latestOutbound.sent_at ?? latestOutbound.created_at)!)) {
    const firstName = formatFirstName(contact.name);
    return {
      subject: `Re: quick intro`,
      body: [
        `Hi ${firstName},`,
        "",
        "Thanks for getting back to me.",
        "I appreciate the context and would love to keep the conversation moving if you’re open to it.",
        "",
        "Best,",
        profile?.full_name?.trim() || "Me",
      ].join("\n"),
      reason: "They replied and there is no later outbound response.",
      goal: "follow_up",
      mode: "new",
    };
  }

  const upcomingMeeting = meetings.find((meeting) => {
    if (meeting.status !== "scheduled") return false;
    const scheduledFor = toDate(meeting.scheduled_for);
    if (!scheduledFor) return false;
    const diff = scheduledFor.getTime() - Date.now();
    return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
  });

  if (upcomingMeeting) {
    const firstName = formatFirstName(contact.name);
    return {
      subject: `Looking forward to tomorrow`,
      body: [
        `Hi ${firstName},`,
        "",
        "Looking forward to our conversation tomorrow.",
        "I’ll come prepared with a few questions about your path and what’s been most useful in your role.",
        "",
        "Best,",
        profile?.full_name?.trim() || "Me",
      ].join("\n"),
      reason: "There is a meeting within the next 24 hours.",
      goal: "follow_up",
      mode: "new",
    };
  }

  const silentDays = daysSince(
    latestTouch ? latestTouch.toISOString() : contact.last_interaction_at,
  );
  if (silentDays !== null && silentDays >= 14) {
    const starter = buildStarterDraft({ contact, company, profile });
    return {
      ...starter,
      reason: `This thread has been quiet for ${silentDays} days.`,
      goal: "reconnect",
      mode: "new",
    };
  }

  const starter = buildStarterDraft({ contact, company, profile });
  return {
    ...starter,
    reason: company?.is_target
      ? "This is a target company with no outreach yet."
      : "A clear cold intro keeps the thread moving.",
    goal: "cold_intro",
    mode: "new",
  };
}

export default async function ContactThreadPage({ params }: ContactPageProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [
    { data: contact },
    { data: messagesData },
    { data: interactionsData },
    { data: chatMessagesData },
    { data: meetingsData },
    { data: prepBriefsData },
    { data: profile },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, user_id, name, company_id, role, level, relationship, linkedin_url, email, stage, notes, last_interaction_at, avatar_url, company:companies(id, name, notes, research_cache, is_target, target_roles, last_researched_at, updated_at)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, user_id, contact_id, goal, subject, body, confidence, personalization_signals, direction, status, sent_at, received_at, source, created_at, updated_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("interactions")
      .select("id, user_id, contact_id, type, occurred_at, summary, raw_notes, created_at, updated_at")
      .eq("contact_id", id)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("outreach_chat_messages")
      .select("id, user_id, contact_id, role, content, created_at, updated_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("meetings")
      .select("id, user_id, contact_id, company_id, meeting_type, scheduled_for, title, notes, status, completed_at, created_at, updated_at")
      .eq("contact_id", id)
      .order("scheduled_for", { ascending: true }),
    supabase
      .from("prep_briefs")
      .select("id, user_id, contact_id, company_id, meeting_id, title, about_them, company_context, your_pitch, questions_to_ask, goal_for_call, follow_up_notes, generated_at, updated_at, created_at")
      .eq("contact_id", id)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("user_profiles")
      .select("user_id, full_name, background_summary, resume_text, current_situation, voice_samples, onboarding_completed_at")
      .maybeSingle(),
  ]);

  if (!contact) {
    notFound();
  }

  const contactRecord = contact as any;
  const company = contactRecord.company ?? null;
  const messages = messagesData ?? [];
  const interactions = interactionsData ?? [];
  const chatMessages = chatMessagesData ?? [];
  const meetings = meetingsData ?? [];
  const prepBrief = prepBriefsData?.[0] ?? null;
  const latestDraft = messages.find(
    (message) => message.direction === "outbound" && message.status === "draft",
  ) ?? null;
  const suggestion = buildSuggestion({
    contact: contactRecord,
    company,
    profile,
    messages,
    interactions,
    meetings,
  });

  return (
    <ContactThreadClient
      contact={contactRecord}
      company={company}
      profile={profile}
      messages={messages}
      interactions={interactions}
      chatMessages={chatMessages}
      meetings={meetings}
      suggestion={suggestion}
      latestDraft={latestDraft}
      prepBrief={prepBrief}
    />
  );
}
