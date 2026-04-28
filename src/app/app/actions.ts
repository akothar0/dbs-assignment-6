"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { InteractionType, PipelineStage } from "@/lib/database.types";
import { addDays, interactionTypes, pipelineStages } from "@/lib/crm";
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

  if (!title) {
    throw new Error("Task title is required.");
  }

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    contact_id: contactId,
    title,
    description: optionalString(formData.get("description")),
    due_at: optionalString(formData.get("due_at")),
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
