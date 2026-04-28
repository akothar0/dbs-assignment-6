import type { InteractionType, PipelineStage } from "@/lib/database.types";

export const pipelineStages: Array<{ value: PipelineStage; label: string }> = [
  { value: "cold", label: "Cold" },
  { value: "reached_out", label: "Reached Out" },
  { value: "replied", label: "Replied" },
  { value: "coffee_chat", label: "Coffee Chat" },
  { value: "referred_applied", label: "Referred/Applied" },
  { value: "closed", label: "Closed" },
];

export function formatStage(stage: PipelineStage) {
  return pipelineStages.find((item) => item.value === stage)?.label ?? stage;
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export const interactionTypes: Array<{ value: InteractionType; label: string }> =
  [
    { value: "email", label: "Email" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "coffee_chat", label: "Coffee Chat" },
    { value: "call", label: "Call" },
    { value: "note", label: "Note" },
    { value: "application", label: "Application" },
    { value: "referral", label: "Referral" },
  ];

export function formatInteractionType(type: InteractionType) {
  return interactionTypes.find((item) => item.value === type)?.label ?? type;
}

export function addDays(value: string | Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}
