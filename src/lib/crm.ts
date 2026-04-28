import type {
  ApplicationStatus,
  DraftGoal,
  InteractionType,
  PipelineStage,
  PrepItemType,
} from "@/lib/database.types";

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

export const draftGoals: Array<{ value: DraftGoal; label: string }> = [
  { value: "cold_intro", label: "Cold intro" },
  { value: "follow_up", label: "Follow-up" },
  { value: "thank_you", label: "Thank-you" },
  { value: "referral_ask", label: "Referral ask" },
  { value: "reconnect", label: "Reconnect" },
];

export function formatDraftGoal(goal: DraftGoal) {
  return draftGoals.find((item) => item.value === goal)?.label ?? goal;
}

export const applicationStatuses: Array<{
  value: ApplicationStatus;
  label: string;
}> = [
  { value: "target", label: "Target" },
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

export function formatApplicationStatus(status: ApplicationStatus) {
  return (
    applicationStatuses.find((item) => item.value === status)?.label ?? status
  );
}

export const prepItemTypes: Array<{ value: PrepItemType; label: string }> = [
  { value: "company_research", label: "Company research" },
  { value: "coffee_chat_prep", label: "Coffee-chat prep" },
  { value: "interview_prep", label: "Interview prep" },
  { value: "behavioral_story", label: "Behavioral story" },
  { value: "talking_point", label: "Talking point" },
  { value: "thank_you_follow_up", label: "Thank-you follow-up" },
  { value: "prep_brief", label: "Prep brief" },
  { value: "raw_capture", label: "Raw capture" },
];

export function formatPrepItemType(type: PrepItemType) {
  return prepItemTypes.find((item) => item.value === type)?.label ?? type;
}
