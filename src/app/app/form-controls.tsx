"use client";

import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  pendingDescription?: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function PendingFieldset({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <fieldset
      aria-busy={pending}
      className={className}
      disabled={pending}
    >
      {children}
    </fieldset>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  pendingDescription,
  variant = "primary",
  className = "",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const buttonClass =
    variant === "primary"
      ? "bg-[#1f6f68] text-white transition hover:bg-[#195b55] disabled:cursor-not-allowed disabled:bg-[#8aa9a5]"
      : "border border-[#c9c0b2] text-[#171512] transition hover:bg-[#eee7dc] disabled:cursor-not-allowed disabled:text-[#8b8378]";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      <button
        className={`rounded-md px-4 py-2 text-sm font-semibold ${buttonClass}`}
        disabled={pending}
        type="submit"
      >
        {pending ? pendingLabel : label}
      </button>
      {pending && pendingDescription ? (
        <p className="text-sm font-medium text-[#1f6f68]">
          {pendingDescription}
        </p>
      ) : null}
    </div>
  );
}
