const stages = [
  "Cold",
  "Reached Out",
  "Replied",
  "Coffee Chat",
  "Referred/Applied",
  "Closed",
];

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pipeline</h1>
        <p className="mt-2 text-[#6d665c]">
          Relationship stages will show live contact counts once persistence is
          connected.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => (
          <section
            key={stage}
            className="min-h-32 rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-4"
          >
            <h2 className="text-sm font-semibold">{stage}</h2>
            <p className="mt-3 text-sm text-[#6d665c]">0 contacts</p>
          </section>
        ))}
      </div>
    </div>
  );
}
