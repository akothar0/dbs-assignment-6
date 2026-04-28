export default function AppLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded-md bg-[#e3dacc]" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-lg bg-[#eee7dc]" />
        <div className="h-28 animate-pulse rounded-lg bg-[#eee7dc]" />
        <div className="h-28 animate-pulse rounded-lg bg-[#eee7dc]" />
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-[#eee7dc]" />
    </div>
  );
}
