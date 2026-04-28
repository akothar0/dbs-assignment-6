import type { TaskSource, TaskStatus } from "@/lib/database.types";

export function TaskSourceChip({ source }: { source: TaskSource }) {
  const labels: Record<TaskSource, string> = {
    ai: "AI",
    manual: "Manual",
    rule: "Auto-rule",
  };

  return (
    <span className="rounded-md bg-[#eee7dc] px-2 py-1 text-xs font-semibold text-[#5f594f]">
      {labels[source]}
    </span>
  );
}

export function TaskStatusChip({ status }: { status: TaskStatus }) {
  const labels: Record<TaskStatus, string> = {
    completed: "Completed",
    dismissed: "Dismissed",
    open: "Open",
  };
  const className =
    status === "open"
      ? "bg-[#e5f0ee] text-[#1f6f68]"
      : "bg-[#eee7dc] text-[#5f594f]";

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${className}`}>
      {labels[status]}
    </span>
  );
}
