import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server";
import { createOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { buildPrepInput, buildPrepInstructions, parsePrepBriefText } from "@/lib/rolo-ai";

type Body = {
  contact_id?: string;
  meeting_id?: string;
};

const encoder = new TextEncoder();

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  const supabase = await createSupabaseServerClient();
  const payload = (await request.json()) as Body;
  const contactId = payload.contact_id?.trim();
  const meetingId = payload.meeting_id?.trim() || null;

  if (!contactId) {
    return jsonError("Contact id is required.");
  }

  const [
    { data: contactData },
    { data: profileData },
    { data: messagesData },
    { data: interactionsData },
    { data: chatMessagesData },
    { data: meetingsData },
    { data: existingBriefData },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, role, level, relationship, linkedin_url, email, stage, notes, company_id, company:companies(id, name, notes, research_cache, is_target, target_roles)")
      .eq("id", contactId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("user_id, full_name, background_summary, current_situation, resume_text, voice_samples")
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, subject, body, direction, status, sent_at, received_at, created_at, source")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false }),
    supabase
      .from("interactions")
      .select("id, type, occurred_at, summary, raw_notes")
      .eq("contact_id", contactId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("outreach_chat_messages")
      .select("id, role, content, created_at")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true }),
    supabase
      .from("meetings")
      .select("id, title, meeting_type, scheduled_for, notes, status")
      .eq("contact_id", contactId)
      .order("scheduled_for", { ascending: true }),
    meetingId
      ? supabase
          .from("prep_briefs")
          .select("id, user_id, contact_id, company_id, meeting_id, title, about_them, company_context, your_pitch, questions_to_ask, goal_for_call, follow_up_notes, generated_at, updated_at, created_at")
          .eq("meeting_id", meetingId)
          .maybeSingle()
      : supabase
          .from("prep_briefs")
          .select("id, user_id, contact_id, company_id, meeting_id, title, about_them, company_context, your_pitch, questions_to_ask, goal_for_call, follow_up_notes, generated_at, updated_at, created_at")
          .eq("contact_id", contactId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
  ]);

  if (!contactData) {
    return jsonError("Contact not found.", 404);
  }

  const contact = contactData as any;
  const company = (contact.company ?? {
    name: "Unknown company",
    notes: null,
    research_cache: {},
    is_target: false,
    target_roles: [],
  }) as any;
  const profile = (profileData ?? {
    full_name: null,
    background_summary: null,
    current_situation: null,
    resume_text: null,
    voice_samples: [],
  }) as any;
  const messages = (messagesData ?? []) as any[];
  const interactions = (interactionsData ?? []) as any[];
  const chatMessages = (chatMessagesData ?? []) as any[];
  const meetings = (meetingsData ?? []) as any[];
  const existingBrief = (Array.isArray(existingBriefData) ? existingBriefData[0] : existingBriefData) as any;
  const focusMeeting =
    (meetingId ? meetings.find((meeting) => meeting.id === meetingId) : null) ??
    meetings.find((meeting) => meeting.status === "scheduled") ??
    null;
  const hasVoiceSamples = (profile.voice_samples ?? []).length > 0;
  const model = getOpenAIModel();

  const requestText = [
    "Generate a call prep brief for the upcoming conversation.",
    "Use the contact, company, thread history, meeting details, and any cached company research.",
    "Make the five sections immediately useful before the call.",
    "Keep the language practical and plain.",
  ].join("\n");

  const promptInput = buildPrepInput({
    profile,
    contact,
    company,
    messages,
    interactions,
    chatMessages,
    meeting: focusMeeting,
    request: requestText,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = createOpenAIClient();
        const response = client.responses.stream({
          model,
          instructions: buildPrepInstructions(hasVoiceSamples),
          input: promptInput,
          prompt_cache_key: `rolo-prep:${userId}:${company.id ?? contactId}`,
        });

        let fullText = "";

        for await (const event of response) {
          if (event.type === "response.output_text.delta") {
            fullText += event.delta;
            controller.enqueue(encoder.encode(event.delta));
          }
        }

        const parsed = parsePrepBriefText(fullText);
        const companyCache = company.research_cache ?? {};
        const nextResearchCache =
          companyCache && typeof companyCache === "object" && !Array.isArray(companyCache)
            ? {
                ...companyCache,
                prep_company_context: companyCache.prep_company_context ?? parsed.company_context,
                prep_company_context_updated_at: companyCache.prep_company_context_updated_at ?? new Date().toISOString(),
              }
            : {
                prep_company_context: parsed.company_context,
                prep_company_context_updated_at: new Date().toISOString(),
              };

        if (!companyCache?.prep_company_context && company.id) {
          const { error: companyError } = await supabase
            .from("companies")
            .update({ research_cache: nextResearchCache, last_researched_at: new Date().toISOString() })
            .eq("id", company.id)
            .eq("user_id", userId);

          if (companyError) {
            throw new Error(companyError.message);
          }
        }

        const briefPayload = {
          user_id: userId,
          contact_id: contactId,
          company_id: company.id ?? null,
          meeting_id: focusMeeting?.id ?? meetingId,
          title: existingBrief?.title ?? focusMeeting?.title ?? "Prep brief",
          about_them: parsed.about_them || "",
          company_context: parsed.company_context || "",
          your_pitch: parsed.your_pitch || "",
          questions_to_ask: parsed.questions_to_ask ?? [],
          goal_for_call: parsed.goal_for_call || "",
          follow_up_notes: existingBrief?.follow_up_notes ?? "",
          generated_at: new Date().toISOString(),
        };

        const briefQuery = focusMeeting?.id
          ? supabase.from("prep_briefs").upsert(briefPayload, { onConflict: "meeting_id" })
          : existingBrief?.id
            ? supabase.from("prep_briefs").update(briefPayload).eq("id", existingBrief.id)
            : supabase.from("prep_briefs").insert(briefPayload);

        const { error } = await briefQuery;

        if (error) {
          throw new Error(error.message);
        }

        revalidatePath("/app/prep");
        revalidatePath(`/app/contacts/${contactId}`);
        revalidatePath("/app");

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
