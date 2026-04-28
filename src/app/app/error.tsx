"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something needs attention
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d665c]">
        {error.message ||
          "The workspace could not load. Check your environment variables and Supabase schema."}
      </p>
      <button
        onClick={reset}
        className="mt-5 rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]"
      >
        Try again
      </button>
    </div>
  );
}
