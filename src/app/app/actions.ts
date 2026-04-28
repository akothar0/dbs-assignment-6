"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createOpenAIClient,
  contextCaptureFormat,
  draftResponseFormat,
  getOpenAIModel,
  prepBriefFormat,
} from "@/lib/openai";
import type {
  ApplicationStatus,
  DraftGoal,
  InteractionType,
  PipelineStage,
  PrepItemType,
} from "@/lib/database.types";
import {
  addDays,
  applicationStatuses,
  draftGoals,
  formatDraftGoal,
  interactionTypes,
  pipelineStages,
  prepItemTypes,
} from "@/lib/crm";
import {
  createSupabaseServerClient,
  getCurrentUserId,
} from "@/lib/supabase/server";

function optionalString(value: FormDataEntryValue | null) {
  const text = value?.toString().trim();
  return text ? text : null;
}

function splitList(value: FormDataEntryValue | null) {
  return (
    optionalString(value)
      ?.split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function parseStage(value: FormDataEntryValue | null): PipelineStage {
  const stage = value?.toString() as PipelineStage | undefined;
  if (stage && pipelineStages.some((item) => item.value === stage)) {
    return stage;
  }

  return "cold";
}

function parseInteractionType(value: FormDataEntryValue | null): InteractionType {
  const type = value?.toString() as InteractionType | undefined;
  if (type && interactionTypes.some((item) => item.value === type)) {
    return type;
  }

  return "note";
}

function parseDraftGoal(value: FormDataEntryValue | null): DraftGoal {
  const goal = value?.toString() as DraftGoal | undefined;
  if (goal && draftGoals.some((item) => item.value === goal)) {
    return goal;
  }

  return "follow_up";
}

function parseApplicationStatus(
  value: FormDataEntryValue | null,
): ApplicationStatus {
  const status = value?.toString() as ApplicationStatus | undefined;
  if (status && applicationStatuses.some((item) => item.value === status)) {
    return status;
  }

  return "target";
}

function parsePrepItemType(value: FormDataEntryValue | null): PrepItemType {
  const type = value?.toString() as PrepItemType | undefined;
  if (type && prepItemTypes.some((item) => item.value === type)) {
    return type;
  }

  return "company_research";
}

function nullableId(value: FormDataEntryValue | null) {
  const text = optionalString(value);
  return text && text !== "none" ? text : null;
}

export async function saveProfile(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      full_name: optionalString(formData.get("full_name")),
      background_summary: optionalString(formData.get("background_summary")),
      resume_text: optionalString(formData.get("resume_text")),
      target_roles: splitList(formData.get("target_roles")),
      target_companies: splitList(formData.get("target_companies")),
      writing_preferences: optionalString(formData.get("writing_preferences")),
      recruiting_deadline: optionalString(formData.get("recruiting_deadline")),
      onboarding_completed_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/onboarding");
  revalidatePath("/app/today");
  redirect("/app/today");
}

export async function createContact(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const name = optionalString(formData.get("name"));

  if (!name) {
    throw new Error("Contact name is required.");
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: userId,
      name,
      company: optionalString(formData.get("company")),
      role: optionalString(formData.get("role")),
      level: optionalString(formData.get("level")),
      relationship: optionalString(formData.get("relationship")),
      linkedin_url: optionalString(formData.get("linkedin_url")),
      email: optionalString(formData.get("email")),
      stage: parseStage(formData.get("stage")),
      notes: optionalString(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/contacts");
  revalidatePath("/app/pipeline");
  redirect(`/app/contacts/${data.id}`);
}

export async function updateContactStage(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));

  if (!contactId) {
    throw new Error("Contact id is required.");
  }

  const { error } = await supabase
    .from("contacts")
    .update({ stage: parseStage(formData.get("stage")) })
    .eq("id", contactId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/contacts");
  revalidatePath(`/app/contacts/${contactId}`);
  revalidatePath("/app/pipeline");
}

export async function createApplication(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const company = optionalString(formData.get("company"));
  const role = optionalString(formData.get("role"));
  const contactId = nullableId(formData.get("contact_id"));
  const deadline = optionalString(formData.get("deadline"));
  const nextStep = optionalString(formData.get("next_step"));

  if (!company || !role) {
    throw new Error("Company and role are required.");
  }

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      contact_id: contactId,
      company,
      role,
      source: optionalString(formData.get("source")),
      status: parseApplicationStatus(formData.get("status")),
      deadline,
      next_step: nextStep,
      notes: optionalString(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (deadline) {
    const { error: taskError } = await supabase.from("tasks").insert({
      user_id: userId,
      contact_id: contactId,
      title: nextStep ?? `Application deadline: ${role} at ${company}`,
      description: `Application deadline for ${role} at ${company}.`,
      due_at: new Date(deadline).toISOString(),
      source: "rule",
    });

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  revalidatePath("/app/today");
  revalidatePath("/app/applications");
  redirect(`/app/applications#application-${data.id}`);
}

export async function updateApplicationStatus(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const applicationId = optionalString(formData.get("application_id"));

  if (!applicationId) {
    throw new Error("Application id is required.");
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: parseApplicationStatus(formData.get("status")) })
    .eq("id", applicationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/applications");
  revalidatePath("/app/today");
}

export async function createPrepItem(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const title = optionalString(formData.get("title"));
  const dueAt = optionalString(formData.get("due_at"));
  const contactId = nullableId(formData.get("contact_id"));
  const applicationId = nullableId(formData.get("application_id"));

  if (!title) {
    throw new Error("Prep title is required.");
  }

  const { error } = await supabase.from("prep_items").insert({
    user_id: userId,
    contact_id: contactId,
    application_id: applicationId,
    type: parsePrepItemType(formData.get("type")),
    title,
    body: optionalString(formData.get("body")),
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (dueAt) {
    const { error: taskError } = await supabase.from("tasks").insert({
      user_id: userId,
      contact_id: contactId,
      title,
      description: "Prep item with a due date.",
      due_at: new Date(dueAt).toISOString(),
      source: "manual",
    });

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  revalidatePath("/app/today");
  revalidatePath("/app/prep");
}

export async function completePrepItem(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const prepItemId = optionalString(formData.get("prep_item_id"));

  if (!prepItemId) {
    throw new Error("Prep item id is required.");
  }

  const { error } = await supabase
    .from("prep_items")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", prepItemId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/prep");
}

export async function generatePrepBrief(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const openai = createOpenAIClient();
  const contactId = nullableId(formData.get("contact_id"));
  const applicationId = nullableId(formData.get("application_id"));
  const focus = optionalString(formData.get("focus"));

  const [
    { data: profile },
    { data: contact },
    { data: application },
    { data: recentInteractions },
    { data: prepItems },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").maybeSingle(),
    contactId
      ? supabase.from("contacts").select("*").eq("id", contactId).maybeSingle()
      : Promise.resolve({ data: null }),
    applicationId
      ? supabase
          .from("applications")
          .select("*")
          .eq("id", applicationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    contactId
      ? supabase
          .from("interactions")
          .select("type, occurred_at, summary, raw_notes")
          .eq("contact_id", contactId)
          .order("occurred_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] }),
    supabase
      .from("prep_items")
      .select("type, title, body, due_at")
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const response = await openai.responses.parse({
    model: getOpenAIModel(),
    max_output_tokens: 1600,
    instructions:
      "You create practical MBA recruiting prep briefs. Be specific, concise, and action-oriented. Ground the brief in the supplied profile, contact, application, interactions, and prep notes.",
    input: [
      {
        role: "user",
        content: JSON.stringify(
          {
            focus,
            userProfile: profile,
            contact,
            application,
            recentInteractions: recentInteractions ?? [],
            existingPrep: prepItems ?? [],
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: prepBriefFormat(),
    },
  });
  const parsed = response.output_parsed;

  if (!parsed?.brief) {
    throw new Error("OpenAI returned an empty prep brief.");
  }

  const body = [
    parsed.brief,
    parsed.talkingPoints.length
      ? `\nTalking points\n${parsed.talkingPoints.map((item) => `- ${item}`).join("\n")}`
      : "",
    parsed.questionsToAsk.length
      ? `\nQuestions to ask\n${parsed.questionsToAsk.map((item) => `- ${item}`).join("\n")}`
      : "",
    parsed.risksOrGaps.length
      ? `\nRisks or gaps\n${parsed.risksOrGaps.map((item) => `- ${item}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await supabase.from("prep_items").insert({
    user_id: userId,
    contact_id: contactId,
    application_id: applicationId,
    type: "prep_brief",
    title: parsed.title,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  const taskInserts = parsed.nextSteps
    .filter((task) => task.title.trim())
    .map((task) => ({
      user_id: userId,
      contact_id: contactId,
      title: task.title.trim(),
      description: "Suggested from an AI prep brief.",
      due_at: task.due_at ? new Date(task.due_at).toISOString() : null,
      source: "ai" as const,
    }));

  if (taskInserts.length > 0) {
    const { error: taskError } = await supabase
      .from("tasks")
      .insert(taskInserts);

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  revalidatePath("/app/today");
  revalidatePath("/app/prep");
}

export async function captureContext(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const openai = createOpenAIClient();
  const rawContext = optionalString(formData.get("raw_context"));
  const contactIdFromForm = nullableId(formData.get("contact_id"));
  const applicationId = nullableId(formData.get("application_id"));

  if (!rawContext) {
    throw new Error("Context is required.");
  }

  const response = await openai.responses.parse({
    model: getOpenAIModel(),
    max_output_tokens: 1400,
    instructions:
      "Extract practical CRM updates from pasted recruiting context. Prefer conservative extraction over invention. Return only facts supported by the pasted text.",
    input: [
      {
        role: "user",
        content: JSON.stringify(
          {
            rawContext,
            selectedContactId: contactIdFromForm,
            selectedApplicationId: applicationId,
          },
          null,
          2,
        ),
      },
    ],
    text: {
      format: contextCaptureFormat(),
    },
  });
  const parsed = response.output_parsed;

  if (!parsed) {
    throw new Error("OpenAI returned no extracted context.");
  }

  let contactId = contactIdFromForm;

  if (!contactId && parsed.contact?.name) {
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .insert({
        user_id: userId,
        name: parsed.contact.name,
        company: parsed.contact.company,
        role: parsed.contact.role,
        email: parsed.contact.email,
        linkedin_url: parsed.contact.linkedinUrl,
        relationship: parsed.contact.relationship,
        notes: parsed.notes,
      })
      .select("id")
      .single();

    if (contactError) {
      throw new Error(contactError.message);
    }

    contactId = contact.id;
  }

  if (parsed.interaction && contactId) {
    const { error } = await supabase.from("interactions").insert({
      user_id: userId,
      contact_id: contactId,
      type: parsed.interaction.type,
      occurred_at: parsed.interaction.occurred_at
        ? new Date(parsed.interaction.occurred_at).toISOString()
        : new Date().toISOString(),
      summary: parsed.interaction.summary,
      raw_notes: parsed.interaction.raw_notes ?? rawContext,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  if (parsed.prepItem) {
    const { error } = await supabase.from("prep_items").insert({
      user_id: userId,
      contact_id: contactId,
      application_id: applicationId,
      type: parsed.prepItem.type,
      title: parsed.prepItem.title,
      body: parsed.prepItem.body ?? rawContext,
      due_at: parsed.prepItem.due_at
        ? new Date(parsed.prepItem.due_at).toISOString()
        : null,
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  const taskInserts = parsed.tasks
    .filter((task) => task.title.trim())
    .map((task) => ({
      user_id: userId,
      contact_id: contactId,
      title: task.title.trim(),
      description: task.description,
      due_at: task.due_at ? new Date(task.due_at).toISOString() : null,
      source: "ai" as const,
    }));

  if (taskInserts.length > 0) {
    const { error } = await supabase.from("tasks").insert(taskInserts);
    if (error) {
      throw new Error(error.message);
    }
  }

  revalidatePath("/app/today");
  revalidatePath("/app/contacts");
  revalidatePath("/app/prep");
}

export async function logInteraction(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const summary = optionalString(formData.get("summary"));
  const type = parseInteractionType(formData.get("type"));
  const occurredAt =
    optionalString(formData.get("occurred_at")) ?? new Date().toISOString();

  if (!contactId || !summary) {
    throw new Error("Contact id and summary are required.");
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id, name, stage")
    .eq("id", contactId)
    .single();

  if (contactError) {
    throw new Error(contactError.message);
  }

  const { error } = await supabase.from("interactions").insert({
    user_id: userId,
    contact_id: contactId,
    type,
    occurred_at: new Date(occurredAt).toISOString(),
    summary,
    raw_notes: optionalString(formData.get("raw_notes")),
  });

  if (error) {
    throw new Error(error.message);
  }

  const ruleTasks: Array<{
    user_id: string;
    contact_id: string;
    title: string;
    description: string;
    due_at: string;
    source: "rule";
  }> = [];

  if (type === "coffee_chat") {
    ruleTasks.push({
      user_id: userId,
      contact_id: contactId,
      title: `Send thank-you to ${contact.name}`,
      description: "Logged after a coffee chat.",
      due_at: addDays(occurredAt, 1),
      source: "rule",
    });
  }

  if (type === "email" || type === "linkedin") {
    ruleTasks.push({
      user_id: userId,
      contact_id: contactId,
      title: `Follow up with ${contact.name}`,
      description: "No reply logged after outreach.",
      due_at: addDays(occurredAt, 7),
      source: "rule",
    });
  }

  if (type === "call" || type === "coffee_chat") {
    ruleTasks.push({
      user_id: userId,
      contact_id: contactId,
      title: `Reconnect with ${contact.name}`,
      description: "Keep the relationship warm after the last conversation.",
      due_at: addDays(occurredAt, 14),
      source: "rule",
    });
  }

  if (ruleTasks.length > 0) {
    const { error: taskError } = await supabase.from("tasks").insert(ruleTasks);
    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  if (type === "coffee_chat" && contact.stage !== "coffee_chat") {
    await supabase
      .from("contacts")
      .update({ stage: "coffee_chat" })
      .eq("id", contactId);
  }

  revalidatePath("/app/today");
  revalidatePath("/app/contacts");
  revalidatePath(`/app/contacts/${contactId}`);
  revalidatePath("/app/pipeline");
}

export async function createTask(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const contactId = optionalString(formData.get("contact_id"));
  const title = optionalString(formData.get("title"));
  const dueAt = optionalString(formData.get("due_at"));

  if (!title) {
    throw new Error("Task title is required.");
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    contact_id: contactId,
    title,
    description: optionalString(formData.get("description")),
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    source: "manual",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/today");
  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}

export async function completeTask(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const taskId = optionalString(formData.get("task_id"));
  const contactId = optionalString(formData.get("contact_id"));

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/today");
  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}

export async function dismissTask(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const taskId = optionalString(formData.get("task_id"));
  const contactId = optionalString(formData.get("contact_id"));

  if (!taskId) {
    throw new Error("Task id is required.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "dismissed" })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app/today");
  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}

export async function generateDraft(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const openai = createOpenAIClient();
  const contactId = optionalString(formData.get("contact_id"));
  const goal = parseDraftGoal(formData.get("goal"));
  const instructions = optionalString(formData.get("instructions"));

  if (!contactId) {
    throw new Error("Contact id is required.");
  }

  const [
    { data: profile },
    { data: contact },
    { data: interactions },
    { data: applications },
    { data: prepItems },
  ] = await Promise.all([
    supabase.from("user_profiles").select("*").maybeSingle(),
    supabase.from("contacts").select("*").eq("id", contactId).single(),
    supabase
      .from("interactions")
      .select("type, occurred_at, summary, raw_notes")
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false })
      .limit(8),
    supabase
      .from("applications")
      .select("company, role, status, deadline, next_step, notes")
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("prep_items")
      .select("type, title, body, due_at")
      .eq("contact_id", contactId)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  if (!contact) {
    throw new Error("Contact not found.");
  }

  const prompt = {
    goal: formatDraftGoal(goal),
    userProfile: profile,
    contact,
    recentInteractions: interactions ?? [],
    linkedApplications: applications ?? [],
    relatedPrep: prepItems ?? [],
    instructions,
    outputContract: {
      subject: "optional email subject",
      body: "editable outreach draft",
      confidence: "number between 0 and 1",
      personalizationSignals: ["specific facts used"],
      suggestedTask: {
        title: "optional next task title",
        description: "optional task description",
        due_at: "optional ISO timestamp or null",
      },
      suggestedStage: "optional pipeline stage enum or null",
      reasoning: "brief rationale for the suggestion",
    },
    validStages: pipelineStages.map((stage) => stage.value),
  };

  const response = await openai.responses.parse({
    model: getOpenAIModel(),
    max_output_tokens: 1400,
    instructions:
      "You write warm, specific MBA recruiting outreach inside a broader job-search workspace. Use contact, application, prep, and user profile context when relevant. Avoid generic praise, exaggeration, and sales language. Return a concise editable draft and practical next-step suggestions.",
    input: [
      {
        role: "user",
        content: JSON.stringify(prompt, null, 2),
      },
    ],
    text: {
      format: draftResponseFormat(),
    },
  });
  const parsed = response.output_parsed;

  if (!parsed?.body) {
    throw new Error("OpenAI returned an empty draft.");
  }

  const suggestedStage = pipelineStages.some(
    (stage) => stage.value === parsed.suggestedStage,
  )
    ? parsed.suggestedStage
    : null;

  const { data: draft, error: draftError } = await supabase
    .from("message_drafts")
    .insert({
      user_id: userId,
      contact_id: contactId,
      goal,
      subject: parsed.subject ?? null,
      body: parsed.body,
      confidence: parsed.confidence ?? null,
      personalization_signals: parsed.personalizationSignals ?? [],
    })
    .select("id")
    .single();

  if (draftError) {
    throw new Error(draftError.message);
  }

  if (parsed.suggestedTask || suggestedStage || parsed.reasoning) {
    const { error: suggestionError } = await supabase
      .from("ai_suggestions")
      .insert({
        user_id: userId,
        contact_id: contactId,
        draft_id: draft.id,
        suggested_task: parsed.suggestedTask ?? null,
        suggested_stage: suggestedStage,
        reasoning: parsed.reasoning ?? null,
      });

    if (suggestionError) {
      throw new Error(suggestionError.message);
    }
  }

  revalidatePath(`/app/contacts/${contactId}`);
}

function suggestedTaskToInsert(
  task: unknown,
  userId: string,
  contactId: string | null,
) {
  if (!task || typeof task !== "object") {
    return null;
  }

  const record = task as {
    title?: unknown;
    description?: unknown;
    due_at?: unknown;
  };

  if (typeof record.title !== "string" || !record.title.trim()) {
    return null;
  }

  return {
    user_id: userId,
    contact_id: contactId,
    title: record.title.trim(),
    description:
      typeof record.description === "string" ? record.description : null,
    due_at: typeof record.due_at === "string" ? record.due_at : null,
    source: "ai" as const,
  };
}

export async function acceptAiSuggestion(formData: FormData) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const suggestionId = optionalString(formData.get("suggestion_id"));
  const contactId = optionalString(formData.get("contact_id"));

  if (!suggestionId) {
    throw new Error("Suggestion id is required.");
  }

  const { data: suggestion, error } = await supabase
    .from("ai_suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const taskInsert = suggestedTaskToInsert(
    suggestion.suggested_task,
    userId,
    suggestion.contact_id,
  );

  if (taskInsert) {
    const { error: taskError } = await supabase.from("tasks").insert(taskInsert);
    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  if (suggestion.suggested_stage && suggestion.contact_id) {
    const { error: contactError } = await supabase
      .from("contacts")
      .update({ stage: suggestion.suggested_stage })
      .eq("id", suggestion.contact_id);

    if (contactError) {
      throw new Error(contactError.message);
    }
  }

  const { error: updateError } = await supabase
    .from("ai_suggestions")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", suggestionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/app/today");
  revalidatePath("/app/pipeline");
  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}

export async function dismissAiSuggestion(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const suggestionId = optionalString(formData.get("suggestion_id"));
  const contactId = optionalString(formData.get("contact_id"));

  if (!suggestionId) {
    throw new Error("Suggestion id is required.");
  }

  const { error } = await supabase
    .from("ai_suggestions")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", suggestionId);

  if (error) {
    throw new Error(error.message);
  }

  if (contactId) {
    revalidatePath(`/app/contacts/${contactId}`);
  }
}
