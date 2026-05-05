import type { MessageDirection, MessageStatus, OutreachChatRole } from "@/lib/database.types";

type ThreadMessage = {
  id: string;
  subject: string | null;
  body: string;
  direction: MessageDirection;
  status: MessageStatus;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  source: string | null;
};

type ThreadInteraction = {
  id: string;
  type: string;
  occurred_at: string;
  summary: string;
  raw_notes: string | null;
};

type OutreachChatMessage = {
  role: OutreachChatRole;
  content: string;
  created_at: string;
};

type Profile = {
  full_name: string | null;
  background_summary: string | null;
  current_situation: string | null;
  resume_text: string | null;
  voice_samples: string[];
};

type Contact = {
  name: string;
  role: string | null;
  level: string | null;
  relationship: string | null;
  stage: string;
  notes: string | null;
  linkedin_url: string | null;
  email: string | null;
};

type Company = {
  name: string;
  notes: string | null;
  research_cache: Record<string, unknown> | null;
  is_target: boolean;
  target_roles: string[];
};

type Meeting = {
  id: string;
  title: string | null;
  meeting_type: string;
  scheduled_for: string;
  notes: string | null;
  status: string;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function prettyJson(value: unknown) {
  if (!value || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return "None";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatLines(label: string, value: string | null | undefined) {
  return `${label}\n${value?.trim() || "None"}`;
}

function formatVoiceSamples(samples: string[]) {
  if (!samples.length) {
    return "None provided.";
  }

  return samples
    .map((sample, index) => `${index + 1}. ${sample.trim()}`)
    .join("\n");
}

function formatThreadHistory(messages: ThreadMessage[], interactions: ThreadInteraction[]) {
  const events = [
    ...messages.map((message) => ({
      kind: "message" as const,
      date: message.sent_at ?? message.received_at ?? message.created_at,
      label: `${message.direction} / ${message.status}`,
      id: message.id,
      subject: message.subject,
      body: message.body,
      source: message.source,
    })),
    ...interactions.map((interaction) => ({
      kind: "interaction" as const,
      date: interaction.occurred_at,
      label: interaction.type,
      id: interaction.id,
      summary: interaction.summary,
      raw_notes: interaction.raw_notes,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (events.length === 0) {
    return "None yet.";
  }

  return events
    .map((event, index) => {
      if (event.kind === "message") {
        return [
          `${index + 1}. [${formatDateTime(event.date)}] message (${event.label})`,
          event.subject ? `Subject: ${event.subject}` : null,
          `Body: ${event.body}`,
          event.source ? `Source: ${event.source}` : null,
        ]
          .filter(Boolean)
          .join("\n");
      }

      return [
        `${index + 1}. [${formatDateTime(event.date)}] interaction (${event.label})`,
        `Summary: ${event.summary}`,
        event.raw_notes ? `Notes: ${event.raw_notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function formatChatHistory(chatMessages: OutreachChatMessage[]) {
  if (!chatMessages.length) {
    return "None yet.";
  }

  return chatMessages
    .map((message, index) => {
      const speaker = message.role === "user" ? "You" : "Rolo";
      return `${index + 1}. [${formatDateTime(message.created_at)}] ${speaker}: ${message.content}`;
    })
    .join("\n");
}

function formatProfileBlock(profile: Profile) {
  return [
    formatLines("Full name", profile.full_name),
    formatLines("Background", profile.background_summary),
    formatLines("Current situation", profile.current_situation),
    formatLines("Resume", profile.resume_text),
    `Voice samples\n${formatVoiceSamples(profile.voice_samples ?? [])}`,
  ].join("\n\n");
}

function formatContactBlock(contact: Contact, companyName: string | null) {
  return [
    formatLines("Name", contact.name),
    formatLines("Role", contact.role),
    formatLines("Company", companyName),
    formatLines("Stage", contact.stage),
    formatLines("Relationship", contact.relationship),
    formatLines("Notes", contact.notes),
    formatLines("Email", contact.email),
    formatLines("LinkedIn", contact.linkedin_url),
    formatLines("Level", contact.level),
  ].join("\n\n");
}

function formatCompanyBlock(company: Company) {
  return [
    formatLines("Name", company.name),
    formatLines("Notes", company.notes),
    `Research cache\n${prettyJson(company.research_cache)}`,
    formatLines("Target company", company.is_target ? "Yes" : "No"),
    formatLines("Target roles", company.target_roles.length ? company.target_roles.join(", ") : null),
  ].join("\n\n");
}

function formatMeetingBlock(meeting: Meeting | null) {
  if (!meeting) return "None selected.";

  return [
    formatLines("Title", meeting.title),
    formatLines("Type", meeting.meeting_type),
    formatLines("When", meeting.scheduled_for),
    formatLines("Status", meeting.status),
    formatLines("Notes", meeting.notes),
  ].join("\n\n");
}

function outreachToneInstruction(hasVoiceSamples: boolean) {
  return hasVoiceSamples
    ? "Match the user's voice samples closely without sounding copied. Preserve their sentence rhythm and directness."
    : "Use a neutral professional tone. Do not mention that voice samples are missing.";
}

export function buildOutreachInstructions(hasVoiceSamples: boolean) {
  return [
    "You are Rolo, a relationship-first recruiting assistant.",
    "Never mention internal labels, scores, reason codes, modes, or hidden mechanics.",
    "Never imply autonomous sending. Draft only.",
    outreachToneInstruction(hasVoiceSamples),
    "For cold intros, default to a 2HJS-style five-point email shape: hook, ask, availability, one-line bio, sign-off.",
    "Adapt away from that shape when the relationship is warm, the contact is an alum, or the context clearly calls for a different format.",
    "Be concise, concrete, and human.",
    "Output exactly this format:",
    "Rationale: one short sentence",
    "",
    "Subject: subject line or blank if none is needed",
    "",
    "Draft:",
    "message body only",
  ].join("\n");
}

export function buildPrepInstructions(hasVoiceSamples: boolean) {
  return [
    "You are Rolo, a relationship-first recruiting assistant.",
    "Never mention internal labels, scores, reason codes, modes, or hidden mechanics.",
    outreachToneInstruction(hasVoiceSamples),
    "Generate a usable call prep brief with five sections in this exact order:",
    "ABOUT THEM:",
    "COMPANY CONTEXT:",
    "YOUR PITCH:",
    "QUESTIONS TO ASK:",
    "GOAL FOR CALL:",
    "Use plain language and practical detail.",
    "Keep the brief concise enough to absorb quickly before a call.",
  ].join("\n");
}

export function buildOutreachInput(params: {
  profile: Profile;
  contact: Contact;
  company: Company;
  messages: ThreadMessage[];
  interactions: ThreadInteraction[];
  chatMessages: OutreachChatMessage[];
  request: string;
}) {
  return [
    "PROFILE",
    formatProfileBlock(params.profile),
    "CONTACT",
    formatContactBlock(params.contact, params.company.name),
    "COMPANY",
    formatCompanyBlock(params.company),
    "THREAD HISTORY",
    formatThreadHistory(params.messages, params.interactions),
    "OUTREACH AGENT CHAT",
    formatChatHistory(params.chatMessages),
    "REQUEST",
    params.request,
  ].join("\n\n");
}

export function buildPrepInput(params: {
  profile: Profile;
  contact: Contact;
  company: Company;
  messages: ThreadMessage[];
  interactions: ThreadInteraction[];
  chatMessages: OutreachChatMessage[];
  meeting: Meeting | null;
  request: string;
}) {
  return [
    "PROFILE",
    formatProfileBlock(params.profile),
    "CONTACT",
    formatContactBlock(params.contact, params.company.name),
    "COMPANY",
    formatCompanyBlock(params.company),
    "MEETING",
    formatMeetingBlock(params.meeting),
    "THREAD HISTORY",
    formatThreadHistory(params.messages, params.interactions),
    "OUTREACH AGENT CHAT",
    formatChatHistory(params.chatMessages),
    "REQUEST",
    params.request,
  ].join("\n\n");
}

export function parseOutreachDraftText(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^Rationale:\s*([\s\S]*?)\n\s*Subject:\s*([\s\S]*?)\n\s*Draft:\s*([\s\S]*)$/i);

  if (match) {
    return {
      rationale: match[1].trim(),
      subject: match[2].trim() || null,
      draft: match[3].trim(),
    };
  }

  const subjectMatch = trimmed.match(/^Rationale:\s*([\s\S]*?)(?:\n\s*Subject:\s*([\s\S]*?))?(?:\n\s*Draft:\s*([\s\S]*))?$/i);
  if (subjectMatch) {
    return {
      rationale: subjectMatch[1].trim(),
      subject: subjectMatch[2]?.trim() || null,
      draft: subjectMatch[3]?.trim() || "",
    };
  }

  return {
    rationale: "",
    subject: null,
    draft: trimmed,
  };
}

function splitBullets(value: string) {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

export function parsePrepBriefText(text: string) {
  const sections = {
    about_them: "",
    company_context: "",
    your_pitch: "",
    questions_to_ask: [] as string[],
    goal_for_call: "",
  };

  const normalized = text.replace(/\r\n/g, "\n");
  const headingPattern = /^(ABOUT THEM|COMPANY CONTEXT|YOUR PITCH|QUESTIONS TO ASK|GOAL FOR CALL):?\s*$/i;
  let current: keyof typeof sections | null = null;

  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.trimEnd();
    const heading = line.match(headingPattern)?.[1]?.toUpperCase();

    if (heading) {
      current =
        heading === "ABOUT THEM"
          ? "about_them"
          : heading === "COMPANY CONTEXT"
            ? "company_context"
            : heading === "YOUR PITCH"
              ? "your_pitch"
              : heading === "QUESTIONS TO ASK"
                ? "questions_to_ask"
                : "goal_for_call";
      continue;
    }

    if (!current) continue;

    if (current === "questions_to_ask") {
      sections.questions_to_ask.push(line);
    } else if (sections[current]) {
      sections[current] = `${sections[current]}\n${line}`.trim();
    } else {
      sections[current] = line.trim();
    }
  }

  sections.questions_to_ask = splitBullets(sections.questions_to_ask.join("\n"));

  return sections;
}
