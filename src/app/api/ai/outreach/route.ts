import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server";
import { createOpenAIClient, getOpenAIModel } from "@/lib/openai";
import {
  buildOutreachInput,
  buildOutreachInstructions,
  parseOutreachDraftText,
} from "@/lib/rolo-ai";

type Body = {
  contact_id?: string;
  mode?: "draft" | "chat";
  message?: string;
  goal?: string;
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
  const mode = payload.mode ?? "draft";

  if (!contactId) {
    return jsonError("Contact id is required.");
  }

  const [{ data: contactData }, { data: profileData }, { data: messagesData }, { data: interactionsData }, { data: chatMessagesData }, { data: meetingsData }] =
    await Promise.all([
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
  const hasVoiceSamples = (profile.voice_samples ?? []).length > 0;
  const model = getOpenAIModel();
  const userQuestion = payload.message?.trim() ?? "";

  if (mode === "chat") {
    if (!userQuestion) {
      return jsonError("Chat message is required.");
    }

    const { error: userTurnError } = await supabase.from("outreach_chat_messages").insert({
      user_id: userId,
      contact_id: contactId,
      role: "user",
      content: userQuestion,
    });

    if (userTurnError) {
      return jsonError(userTurnError.message, 500);
    }

    chatMessages.push({
      role: "user",
      content: userQuestion,
      created_at: new Date().toISOString(),
    });
  }

  const latestDraft = messages.find((message) => message.direction === "outbound" && message.status === "draft");
  const latestInbound = messages.find((message) => message.direction === "inbound" && message.status === "received");
  const latestOutbound = messages.find((message) => message.direction === "outbound" && message.status === "sent");
  const latestMeeting = meetings.find((meeting) => meeting.status === "scheduled") ?? null;

  const draftGoal = payload.goal && ["cold_intro", "follow_up", "thank_you", "referral_ask", "reconnect"].includes(payload.goal)
    ? payload.goal
    : latestDraft?.goal ?? "cold_intro";

  const requestText =
    mode === "chat"
      ? [
          "Answer the user's strategy question about this relationship.",
          "Keep it specific to the current thread and the likely next move.",
          "Use plain language.",
          `User question: ${userQuestion}`,
        ].join("\n")
      : [
          "Generate the next outbound message for this thread.",
          "Make the draft usable now and grounded in the relationship history.",
          "If the latest thread activity is an inbound reply, soften the tone into a natural follow-up.",
          latestInbound && (!latestOutbound || new Date(latestInbound.received_at ?? latestInbound.created_at).getTime() > new Date(latestOutbound.sent_at ?? latestOutbound.created_at).getTime())
            ? "The latest thread activity is an inbound reply."
            : null,
          latestMeeting ? `There is a scheduled meeting on ${latestMeeting.scheduled_for}.` : null,
          `Current draft goal: ${draftGoal}.`,
        ]
          .filter(Boolean)
          .join("\n");

  const promptInput = buildOutreachInput({
    profile,
    contact,
    company,
    messages,
    interactions,
    chatMessages,
    request: requestText,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = createOpenAIClient();
        const response = client.responses.stream({
          model,
          instructions: buildOutreachInstructions(hasVoiceSamples),
          input: promptInput,
          prompt_cache_key: `rolo-outreach:${userId}:${contactId}`,
        });

        let fullText = "";

        for await (const event of response) {
          if (event.type === "response.output_text.delta") {
            fullText += event.delta;
            controller.enqueue(encoder.encode(event.delta));
          }
        }

        if (mode === "draft") {
          const parsed = parseOutreachDraftText(fullText);
          const draftBody = parsed.draft || fullText.trim();

          const { error } = await supabase.from("messages").insert({
            user_id: userId,
            contact_id: contactId,
            goal: draftGoal,
            direction: "outbound",
            status: "draft",
            subject: parsed.subject,
            body: draftBody,
            source: "ai",
            personalization_signals: [
              company.name,
              contact.name,
              latestMeeting?.title,
              latestInbound ? "recent reply" : null,
              hasVoiceSamples ? "voice samples" : null,
            ].filter((value): value is string => Boolean(value)),
          });

          if (error) {
            throw new Error(error.message);
          }

          revalidatePath("/app");
          revalidatePath(`/app/contacts/${contactId}`);
        } else {
          const { error } = await supabase.from("outreach_chat_messages").insert({
            user_id: userId,
            contact_id: contactId,
            role: "assistant",
            content: fullText.trim(),
          });

          if (error) {
            throw new Error(error.message);
          }

          revalidatePath(`/app/contacts/${contactId}`);
        }

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
