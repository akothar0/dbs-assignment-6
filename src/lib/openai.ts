import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

export const draftResponseSchema = z.object({
  subject: z.string().nullable(),
  body: z.string(),
  confidence: z.number(),
  personalizationSignals: z.array(z.string()),
  suggestedTask: z
    .object({
      title: z.string(),
      description: z.string().nullable(),
      due_at: z.string().nullable(),
    })
    .nullable(),
  suggestedStage: z
    .enum([
      "cold",
      "reached_out",
      "replied",
      "coffee_chat",
      "referred_applied",
      "closed",
    ])
    .nullable(),
  reasoning: z.string().nullable(),
});

export type DraftResponse = z.infer<typeof draftResponseSchema>;

export const prepBriefSchema = z.object({
  title: z.string(),
  brief: z.string(),
  talkingPoints: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
  risksOrGaps: z.array(z.string()),
  nextSteps: z.array(
    z.object({
      title: z.string(),
      due_at: z.string().nullable(),
    }),
  ),
});

export type PrepBrief = z.infer<typeof prepBriefSchema>;

export const contextCaptureSchema = z.object({
  contact: z
    .object({
      name: z.string().nullable(),
      company: z.string().nullable(),
      role: z.string().nullable(),
      email: z.string().nullable(),
      linkedinUrl: z.string().nullable(),
      relationship: z.string().nullable(),
    })
    .nullable(),
  interaction: z
    .object({
      summary: z.string(),
      type: z.enum([
        "email",
        "linkedin",
        "coffee_chat",
        "call",
        "note",
        "application",
        "referral",
      ]),
      occurred_at: z.string().nullable(),
      raw_notes: z.string().nullable(),
    })
    .nullable(),
  prepItem: z
    .object({
      title: z.string(),
      type: z.enum([
        "company_research",
        "coffee_chat_prep",
        "interview_prep",
        "behavioral_story",
        "talking_point",
        "thank_you_follow_up",
        "prep_brief",
        "raw_capture",
      ]),
      body: z.string().nullable(),
      due_at: z.string().nullable(),
    })
    .nullable(),
  tasks: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullable(),
      due_at: z.string().nullable(),
    }),
  ),
  notes: z.string().nullable(),
});

export type ContextCapture = z.infer<typeof contextCaptureSchema>;

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  return new OpenAI({ apiKey });
}

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

export function draftResponseFormat() {
  return zodTextFormat(draftResponseSchema, "rolo_outreach_draft");
}

export function prepBriefFormat() {
  return zodTextFormat(prepBriefSchema, "rolo_prep_brief");
}

export function contextCaptureFormat() {
  return zodTextFormat(contextCaptureSchema, "rolo_context_capture");
}
