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
