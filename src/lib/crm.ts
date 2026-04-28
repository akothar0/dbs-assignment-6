import type { PipelineStage } from "@/lib/database.types";

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
