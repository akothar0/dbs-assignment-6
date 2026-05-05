"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { parsePrepBriefText } from "@/lib/rolo-ai";

type Props = {
  contact: any | null;
  meeting: any | null;
  existingBrief: any | null;
  profile: any;
};

function briefToSections(brief: any | null) {
  if (!brief) {
    return {
      about_them: "",
      company_context: "",
      your_pitch: "",
      questions_to_ask: [] as string[],
      goal_for_call: "",
    };
  }

  return {
    about_them: brief.about_them ?? "",
    company_context: brief.company_context ?? "",
    your_pitch: brief.your_pitch ?? "",
    questions_to_ask: brief.questions_to_ask ?? [],
    goal_for_call: brief.goal_for_call ?? "",
  };
}

export function PrepAiPreview({ contact, meeting, existingBrief, profile }: Props) {
  const router = useRouter();
  const storageKey = `rolo:auto-prep:${contact?.id ?? "none"}:${meeting?.id ?? "contact"}`;
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState(briefToSections(existingBrief));

  useEffect(() => {
    setSections(briefToSections(existingBrief));
  }, [existingBrief]);

  useEffect(() => {
    if (!contact || existingBrief) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey)) return;

    let cancelled = false;
    const controller = new AbortController();

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    async function loadBrief() {
      setIsGenerating(true);
      setError(null);
      try {
        const response = await fetch("/api/ai/prep", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contact_id: contact.id,
            meeting_id: meeting?.id ?? null,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Brief generation failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });
          setSections(parsePrepBriefText(buffer));
        }

        buffer += decoder.decode();

        if (!cancelled) {
          router.refresh();
        }
      } catch (briefError) {
        if (!cancelled) {
          setError(briefError instanceof Error ? briefError.message : "Failed to generate brief.");
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(storageKey);
          }
        }
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    }

    void loadBrief();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contact, existingBrief, meeting, router, storageKey]);

  const voiceSampleNudge = useMemo(() => {
    if ((profile?.voice_samples?.length ?? 0) > 0) {
      return null;
    }

    return (
      <p className="mt-3 rounded-2xl border border-dashed border-[#d7d0c3] bg-[#fffaf1] px-4 py-3 text-sm text-[#6d665c]">
        Add 1 to 3 voice samples in Profile so Rolo can match your tone more closely.
      </p>
    );
  }, [profile]);

  if (!contact) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">AI brief</h2>
          <p className="mt-1 text-sm text-[#6d665c]">
            {meeting ? `For ${meeting.title ?? contact.name} on ${meeting.scheduled_for}` : `For ${contact.name}`}
          </p>
        </div>
        {isGenerating ? <p className="text-xs text-[#1f6f68]">Streaming brief…</p> : null}
      </div>

      {voiceSampleNudge}
      {error ? <p className="mt-3 text-sm text-[#9a4d3c]">{error}</p> : null}

      <div className="mt-5 grid gap-4">
        {[
          { label: "About them", value: sections.about_them },
          { label: "Company context", value: sections.company_context },
          { label: "Your pitch", value: sections.your_pitch },
          {
            label: "Questions to ask",
            value: sections.questions_to_ask.length ? sections.questions_to_ask.join("\n") : "",
          },
          { label: "Goal for call", value: sections.goal_for_call },
        ].map((section) => (
          <article key={section.label} className="rounded-2xl border border-[#e3dacc] bg-white p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">{section.label}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">
              {section.value || "Waiting on AI content..."}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
