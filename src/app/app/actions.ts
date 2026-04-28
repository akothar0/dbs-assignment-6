"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PipelineStage } from "@/lib/database.types";
import { pipelineStages } from "@/lib/crm";
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
