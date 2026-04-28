import "server-only";

import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY.");
  }

  return new Anthropic({ apiKey });
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
}
