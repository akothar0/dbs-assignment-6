export default function TodayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Today&apos;s queue
        </h1>
        <p className="mt-2 text-[#6d665c]">
          Follow-ups, thank-yous, and reconnects will appear here after the CRM
          data layer is connected.
        </p>
      </div>
      <div className="rounded-lg border border-dashed border-[#c9c0b2] bg-[#fffbf4] p-8">
        <p className="font-medium">No actions yet</p>
        <p className="mt-2 text-sm leading-6 text-[#6d665c]">
          Add contacts and log interactions to generate the first queue items.
        </p>
      </div>
    </div>
  );
}
