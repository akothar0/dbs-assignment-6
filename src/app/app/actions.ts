"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  DraftGoal,
  InteractionType,
  MeetingType,
  PipelineStage,
} from "@/lib/database.types";
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server";

function optionalString(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

function splitLines(value: FormDataEntryValue | null) {
  return optionalString(value)
    ?.split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function compactStrings(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}

function booleanValue(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text === "1" || text === "true" || text === "on";
}

const pipelineStages: PipelineStage[] = [
  "cold",
  "reached_out",
  "replied",
  "coffee_chat",
  "referred_applied",
  "closed",
];

function isPipelineStage(value: string): value is PipelineStage {
  return pipelineStages.includes(value as PipelineStage);
}

const meetingTypes: MeetingType[] = ["coffee_chat", "call", "interview", "other"];

function isMeetingType(value: string): value is MeetingType {
  return meetingTypes.includes(value as MeetingType);
}

const draftGoals: DraftGoal[] = ["cold_intro", "follow_up", "thank_you", "referral_ask", "reconnect"];

function isDraftGoal(value: string): value is DraftGoal {
  return draftGoals.includes(value as DraftGoal);
}

const interactionTypes: InteractionType[] = [
  "coffee_chat",
  "call",
  "note",
  "referral",
];

function isInteractionType(value: string): value is InteractionType {
  return interactionTypes.includes(value as InteractionType);
}

function isoNow() {
  return new Date().toISOString();
}

async function resolveCompanyId(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  companyIdValue: FormDataEntryValue | null,
  companyNameValue: FormDataEntryValue | null,
  options?: { isTarget?: boolean },
) {
  const companyId = optionalString(companyIdValue);
  if (companyId) {
    return companyId;
  }

  const companyName = optionalString(companyNameValue);
  if (!companyName) {
    return null;
  }

  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", companyName)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      name: companyName,
      is_target: options?.isTarget ?? false,
      notes: null,
      research_cache: {},
      target_roles: [],
      last_researched_at: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data.id as string;
}

export async function saveProfile(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      full_name: optionalString(formData.get("full_name")),
      resume_text: optionalString(formData.get("resume_text")),
      background_summary: optionalString(formData.get("background_summary")),
      current_situation: optionalString(formData.get("current_situation")),
      voice_samples: compactStrings([
        optionalString(formData.get("voice_sample_1")),
        optionalString(formData.get("voice_sample_2")),
        optionalString(formData.get("voice_sample_3")),
      ]),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/profile");
}

export async function completeOnboarding(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();

  const fullName = optionalString(formData.get("full_name"));
  const resumeText = optionalString(formData.get("resume_text"));
  const currentSituation = optionalString(formData.get("current_situation"));
  const voiceSamples = [
    optionalString(formData.get("voice_sample_1")),
    optionalString(formData.get("voice_sample_2")),
    optionalString(formData.get("voice_sample_3")),
  ].filter((value): value is string => Boolean(value));
  const companyName = optionalString(formData.get("company_name"));
  const contactName = optionalString(formData.get("contact_name"));
  const contactRole = optionalString(formData.get("contact_role"));

  if (!fullName || !resumeText || !companyName || !contactName) {
    throw new Error("Full name, resume, company, and contact are required.");
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      full_name: fullName,
      resume_text: resumeText,
      current_situation: currentSituation,
      voice_samples: voiceSamples,
      onboarding_completed_at: isoNow(),
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .insert({
      user_id: userId,
      name: companyName,
      is_target: true,
      notes: null,
      research_cache: {},
      target_roles: [],
      last_researched_at: null,
    })
    .select("id")
    .single();

  if (companyError) {
    throw new Error(companyError.message);
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name: contactName,
      company_id: company.id,
      role: contactRole,
      relationship: optionalString(formData.get("relationship")),
      linkedin_url: optionalString(formData.get("linkedin_url")),
      email: optionalString(formData.get("email")),
      stage: "cold",
      notes: optionalString(formData.get("notes")),
    })
    .select("id")
    .single();

  if (contactError) {
    throw new Error(contactError.message);
  }

  const draftBody = [
    `Hi ${contactName},`,
    "",
    `I’m reaching out because I’m recruiting for roles in ${currentSituation ?? "product"} and your path at ${companyName} stood out.`,
    `I’d love to ask a couple of quick questions about your experience and what you’ve seen work well.`,
    "",
    "If you’re open to it, I’d really appreciate 15 minutes.",
    "",
    `Best,`,
    fullName,
  ].join("\n");

  await supabase.from("messages").insert({
    user_id: userId,
    contact_id: contact.id,
    goal: "cold_intro",
    direction: "outbound",
    status: "draft",
    subject: "Quick intro",
    body: draftBody,
    source: "onboarding",
    personalization_signals: [companyName, contactName].filter(Boolean),
  });

  revalidatePath("/app");
  redirect(`/app/contacts/${contact.id}`);
}

export async function createCompany(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const name = optionalString(formData.get("name"));

  if (!name) {
    throw new Error("Company name is required.");
  }

  const payload = {
    user_id: userId,
    name,
    is_target: booleanValue(formData.get("is_target")),
    notes: optionalString(formData.get("notes")),
    research_cache: {},
    target_roles: splitLines(formData.get("target_roles")),
    last_researched_at: null,
  };

  const { data: existing, error: lookupError } = await supabase
    .from("companies")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", name)
    .maybeSingle();

  if (lookupError) {
    throw new Error(lookupError.message);
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("companies").insert(payload);

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
}

export async function createContact(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const name = optionalString(formData.get("name"));

  if (!name) {
    throw new Error("Contact name is required.");
  }

  const companyId = await resolveCompanyId(
    supabase,
    userId,
    formData.get("company_id"),
    formData.get("company_name"),
    { isTarget: booleanValue(formData.get("is_target_company")) },
  );

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name,
      company_id: companyId,
      role: optionalString(formData.get("role")),
      level: optionalString(formData.get("level")),
      relationship: optionalString(formData.get("relationship")),
      linkedin_url: optionalString(formData.get("linkedin_url")),
      email: optionalString(formData.get("email")),
      notes: optionalString(formData.get("notes")),
      stage: "cold",
      avatar_url: optionalString(formData.get("avatar_url")),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");
  redirect(`/app/contacts/${data.id}`);
}

export async function updateContactStage(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const stage = optionalString(formData.get("stage"));

  if (!contactId || !stage || !isPipelineStage(stage)) {
    throw new Error("Contact id and stage are required.");
  }

  const { error } = await supabase
    .from("contacts")
    .update({ stage })
    .eq("id", contactId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath(`/app/contacts/${contactId}`);
}

export async function createMeeting(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const scheduledFor = optionalString(formData.get("scheduled_for"));

  if (!contactId || !scheduledFor) {
    throw new Error("Contact and meeting time are required.");
  }

  const companyId = await resolveCompanyId(
    supabase,
    userId,
    formData.get("company_id"),
    formData.get("company_name"),
  );
  const meetingTypeValue = optionalString(formData.get("meeting_type"));
  const meetingType = meetingTypeValue && isMeetingType(meetingTypeValue) ? meetingTypeValue : "coffee_chat";

  const { error } = await supabase.from("meetings").insert({
    user_id: userId,
    contact_id: contactId,
    company_id: companyId,
    meeting_type: meetingType,
    scheduled_for: new Date(scheduledFor).toISOString(),
    title: optionalString(formData.get("title")),
    notes: optionalString(formData.get("notes")),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath("/app/prep");
  revalidatePath(`/app/contacts/${contactId}`);
}

export async function savePrepBrief(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const meetingId = optionalString(formData.get("meeting_id"));
  const contactId = optionalString(formData.get("contact_id"));
  const companyId = await resolveCompanyId(
    supabase,
    userId,
    formData.get("company_id"),
    formData.get("company_name"),
  );

  const payload = {
    user_id: userId,
    contact_id: contactId,
    company_id: companyId,
    meeting_id: meetingId,
    title: optionalString(formData.get("title")) ?? "Prep brief",
    about_them: optionalString(formData.get("about_them")) ?? "",
    company_context: optionalString(formData.get("company_context")) ?? "",
    your_pitch: optionalString(formData.get("your_pitch")) ?? "",
    questions_to_ask: splitLines(formData.get("questions_to_ask")),
    goal_for_call: optionalString(formData.get("goal_for_call")) ?? "",
    follow_up_notes: optionalString(formData.get("follow_up_notes")) ?? "",
    generated_at: isoNow(),
  };

  const query = meetingId
    ? supabase.from("prep_briefs").upsert(payload, { onConflict: "meeting_id" })
    : supabase.from("prep_briefs").insert(payload);

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/prep");
  revalidatePath(`/app/contacts/${contactId ?? ""}`);
}

export async function createBehavioralStory(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("behavioral_stories").insert({
    user_id: userId,
    title: optionalString(formData.get("title")) ?? "Untitled story",
    situation: optionalString(formData.get("situation")),
    task: optionalString(formData.get("task")),
    action: optionalString(formData.get("action")),
    result: optionalString(formData.get("result")),
    tags: splitLines(formData.get("tags")),
    notes: optionalString(formData.get("notes")),
    favorite: booleanValue(formData.get("favorite")),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/prep");
}

export async function saveMessageDraft(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const body = optionalString(formData.get("body"));
  const messageId = optionalString(formData.get("message_id"));

  if (!contactId || !body) {
    throw new Error("Contact and draft body are required.");
  }

  if (messageId) {
    const goalValue = optionalString(formData.get("goal"));
    const { error } = await supabase
      .from("messages")
      .update({
        goal: goalValue && isDraftGoal(goalValue) ? goalValue : "cold_intro",
        subject: optionalString(formData.get("subject")),
        body,
        source: optionalString(formData.get("source")) ?? "manual",
        personalization_signals: splitLines(formData.get("personalization_signals")),
        status: "draft",
      })
      .eq("id", messageId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const goalValue = optionalString(formData.get("goal"));
    const { error } = await supabase.from("messages").insert({
      user_id: userId,
      contact_id: contactId,
      goal: goalValue && isDraftGoal(goalValue) ? goalValue : "cold_intro",
      direction: "outbound",
      status: "draft",
      subject: optionalString(formData.get("subject")),
      body,
      source: optionalString(formData.get("source")) ?? "manual",
      personalization_signals: splitLines(formData.get("personalization_signals")),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath(`/app/contacts/${contactId}`);
  revalidatePath("/app");
}

export async function markMessageAsSent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const messageId = optionalString(formData.get("message_id"));
  const contactId = optionalString(formData.get("contact_id"));

  if (!messageId) {
    throw new Error("Message id is required.");
  }

  const { error } = await supabase
    .from("messages")
    .update({
      status: "sent",
      sent_at: isoNow(),
    })
    .eq("id", messageId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}

export async function logInboundReply(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const body = optionalString(formData.get("body"));

  if (!contactId || !body) {
    throw new Error("Contact and reply body are required.");
  }

  const { error } = await supabase.from("messages").insert({
    user_id: userId,
    contact_id: contactId,
    goal: (() => {
      const goalValue = optionalString(formData.get("goal"));
      return goalValue && isDraftGoal(goalValue) ? goalValue : "follow_up";
    })(),
    direction: "inbound",
    status: "received",
    subject: optionalString(formData.get("subject")),
    body,
    source: "manual",
    received_at: isoNow(),
    personalization_signals: [],
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath(`/app/contacts/${contactId}`);
}

export async function logInteraction(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const summary = optionalString(formData.get("summary"));
  const typeValue = optionalString(formData.get("type"));
  const type = typeValue && isInteractionType(typeValue) ? typeValue : "note";

  if (!contactId || !summary) {
    throw new Error("Contact and summary are required.");
  }

  const { error } = await supabase.from("interactions").insert({
    user_id: userId,
    contact_id: contactId,
    type,
    occurred_at: optionalString(formData.get("occurred_at")) ?? isoNow(),
    summary,
    raw_notes: optionalString(formData.get("raw_notes")),
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  revalidatePath(`/app/contacts/${contactId}`);
}
