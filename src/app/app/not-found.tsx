import Link from "next/link";

export default function AppNotFound() {
  return (
    <div className="rounded-lg border border-[#d7d0c3] bg-[#fffbf4] p-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Contact not found
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#6d665c]">
        This contact may have been removed or belongs to another account.
      </p>
      <Link
        href="/app/contacts"
        className="mt-5 inline-flex rounded-md bg-[#1f6f68] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#195b55]"
      >
        Back to contacts
      </Link>
    </div>
  );
}
