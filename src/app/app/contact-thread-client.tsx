"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  logInboundReply,
  logInteraction,
  markMessageAsSent,
  saveMessageDraft,
  updateContactStage,
} from "@/app/app/actions";
import { SubmitButton } from "@/app/app/form-controls";
import { parseOutreachDraftText } from "@/lib/rolo-ai";

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function daysBetween(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return null;
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

type Props = {
  contact: any;
  company: any | null;
  profile: any;
  messages: any[];
  interactions: any[];
  chatMessages: any[];
  meetings: any[];
  suggestion: {
    subject: string;
    body: string;
    reason: string;
    goal: string;
    mode: "new" | "draft";
    messageId?: string | null;
  };
  latestDraft: any | null;
  prepBrief: any | null;
};

export function ContactThreadClient({
  contact,
  company,
  profile,
  messages,
  interactions,
  chatMessages,
  meetings,
  suggestion,
  latestDraft,
  prepBrief,
}: Props) {
  const [tab, setTab] = useState<"contact" | "thread" | "chat">("contact");

  const threadEvents = useMemo(() => {
    const events: Array<
      | {
          kind: "message";
          id: string;
          date: string;
          direction: string;
          status: string;
          subject: string | null;
          body: string;
        }
      | {
          kind: "interaction";
          id: string;
          date: string;
          interactionType: string;
          summary: string;
        }
    > = [];

    messages.forEach((message) => {
      events.push({
        kind: "message",
        id: message.id,
        date: message.sent_at ?? message.received_at ?? message.created_at,
        direction: message.direction,
        status: message.status,
        subject: message.subject,
        body: message.body,
      });
    });

    interactions.forEach((interaction) => {
      events.push({
        kind: "interaction",
        id: interaction.id,
        date: interaction.occurred_at,
        interactionType: interaction.type,
        summary: interaction.summary,
      });
    });

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [messages, interactions]);

  const upcomingMeeting = meetings.find((meeting) => meeting.status === "scheduled") ?? null;
  const lastTouch = threadEvents.at(-1)?.date ?? null;

  return (
    <div className="space-y-6">
      <div className="md:hidden">
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[#d7d0c3] bg-[#fffbf4] p-2">
          {[
            ["contact", "Contact"],
            ["thread", "Thread"],
            ["chat", "AI chat"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value as "contact" | "thread" | "chat")}
              className={`rounded-xl px-3 py-2 text-sm font-medium ${
                tab === value ? "bg-[#1f6f68] text-white" : "bg-transparent text-[#5f594f]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden gap-6 md:grid md:grid-cols-[0.9fr_1.3fr_1fr]">
        <ContactCard
          contact={contact}
          company={company}
          lastTouch={lastTouch}
          upcomingMeeting={upcomingMeeting}
        />
        <ThreadTimeline
          contact={contact}
          profile={profile}
          currentDraft={latestDraft}
          suggestion={suggestion}
          threadEvents={threadEvents}
          prepBrief={prepBrief}
        />
        <OutreachChat contact={contact} chatMessages={chatMessages} />
      </div>

      <div className="space-y-6 md:hidden">
        {tab === "contact" ? (
          <ContactCard
            contact={contact}
            company={company}
            lastTouch={lastTouch}
            upcomingMeeting={upcomingMeeting}
          />
        ) : null}
        {tab === "thread" ? (
          <ThreadTimeline
            contact={contact}
            profile={profile}
            currentDraft={latestDraft}
            suggestion={suggestion}
            threadEvents={threadEvents}
            prepBrief={prepBrief}
          />
        ) : null}
        {tab === "chat" ? <OutreachChat contact={contact} chatMessages={chatMessages} /> : null}
      </div>
    </div>
  );
}

function ContactCard({
  contact,
  company,
  lastTouch,
  upcomingMeeting,
}: {
  contact: any;
  company: any | null;
  lastTouch: string | null;
  upcomingMeeting: any | null;
}) {
  return (
    <aside className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f6f68]">Contact</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{contact.name}</h1>
      <p className="mt-2 text-sm text-[#6d665c]">
        {[contact.role, company?.name].filter(Boolean).join(" · ") || "No company set"}
      </p>

      <form action={updateContactStage} className="mt-5 space-y-3 rounded-2xl border border-[#e3dacc] bg-white p-4">
        <input type="hidden" name="contact_id" value={contact.id} />
        <label className="block">
          <span className="text-sm font-semibold">Stage</span>
          <select name="stage" defaultValue={contact.stage} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2">
            {["cold", "reached_out", "replied", "coffee_chat", "referred_applied", "closed"].map((stage) => (
              <option key={stage} value={stage}>
                {stage.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <SubmitButton label="Update stage" pendingLabel="Saving..." variant="secondary" />
      </form>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-sm font-semibold">Last touch</p>
          <p className="mt-1 text-sm text-[#6d665c]">{lastTouch ? formatDate(lastTouch) : "No touch yet"}</p>
        </div>
        {upcomingMeeting ? (
          <div>
            <p className="text-sm font-semibold">Upcoming meeting</p>
            <p className="mt-1 text-sm text-[#6d665c]">{formatDate(upcomingMeeting.scheduled_for)}</p>
            <Link
              className="mt-2 inline-flex text-sm font-medium text-[#1f6f68]"
              href={`/app/prep?contact_id=${contact.id}&meeting_id=${upcomingMeeting.id}`}
            >
              Open prep
            </Link>
          </div>
        ) : null}
        {contact.notes ? (
          <div>
            <p className="text-sm font-semibold">Notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">{contact.notes}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3 text-sm">
          {contact.email ? (
            <a className="font-medium text-[#1f6f68]" href={`mailto:${contact.email}`}>
              Email
            </a>
          ) : null}
          {contact.linkedin_url ? (
            <a className="font-medium text-[#1f6f68]" href={contact.linkedin_url} target="_blank" rel="noreferrer">
              LinkedIn
            </a>
          ) : null}
        </div>

        <form action={logInteraction} className="space-y-3 rounded-2xl border border-[#e3dacc] bg-white p-4">
          <input type="hidden" name="contact_id" value={contact.id} />
          <p className="text-sm font-semibold">Log interaction</p>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">Type</span>
            <select name="type" className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm">
              <option value="coffee_chat">Coffee chat</option>
              <option value="call">Call</option>
              <option value="note">Note</option>
              <option value="referral">Referral</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">Summary</span>
            <textarea name="summary" rows={3} className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
          </label>
          <SubmitButton label="Save interaction" pendingLabel="Saving..." variant="secondary" />
        </form>

        <form action={logInboundReply} className="space-y-3 rounded-2xl border border-[#e3dacc] bg-white p-4">
          <input type="hidden" name="contact_id" value={contact.id} />
          <p className="text-sm font-semibold">Paste a reply</p>
          <textarea name="body" rows={4} placeholder="Paste the reply here" className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm" />
          <SubmitButton label="Log reply" pendingLabel="Saving..." variant="secondary" />
        </form>
      </div>
    </aside>
  );
}

function ThreadTimeline({
  contact,
  profile,
  currentDraft,
  suggestion,
  threadEvents,
  prepBrief,
}: {
  contact: any;
  profile: any;
  currentDraft: any | null;
  suggestion: Props["suggestion"];
  threadEvents: Array<
    | {
        kind: "message";
        id: string;
        date: string;
        direction: string;
        status: string;
        subject: string | null;
        body: string;
      }
    | {
        kind: "interaction";
        id: string;
        date: string;
        interactionType: string;
        summary: string;
      }
  >;
  prepBrief: any | null;
}) {
  const router = useRouter();
  const storageKey = `rolo:auto-draft:${contact.id}`;
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftReason, setDraftReason] = useState(suggestion.reason);
  const [draftSubject, setDraftSubject] = useState(currentDraft?.subject ?? suggestion.subject ?? "");
  const [draftBody, setDraftBody] = useState(currentDraft?.body ?? suggestion.body ?? "");
  const [draftSource, setDraftSource] = useState(currentDraft?.source ?? (currentDraft ? "manual" : "ai"));
  const [draftDirty, setDraftDirty] = useState(Boolean(currentDraft));
  const draftDirtyRef = useRef(draftDirty);

  useEffect(() => {
    draftDirtyRef.current = draftDirty;
  }, [draftDirty]);

  useEffect(() => {
    setDraftReason(suggestion.reason);
    setDraftSubject(currentDraft?.subject ?? suggestion.subject ?? "");
    setDraftBody(currentDraft?.body ?? suggestion.body ?? "");
    setDraftSource(currentDraft?.source ?? (currentDraft ? "manual" : "ai"));
    setDraftDirty(Boolean(currentDraft));
  }, [currentDraft?.id, suggestion.reason, suggestion.subject, suggestion.body, currentDraft]);

  useEffect(() => {
    if (currentDraft) return;
    if (typeof window !== "undefined" && window.sessionStorage.getItem(storageKey)) return;

    let cancelled = false;
    const controller = new AbortController();

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, "1");
    }

    async function loadDraft() {
      setIsGenerating(true);
      try {
        const response = await fetch("/api/ai/outreach", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contact_id: contact.id,
            mode: "draft",
            goal: suggestion.goal,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error("Draft generation failed.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done || cancelled) break;
          buffer += decoder.decode(value, { stream: true });

          const parsed = parseOutreachDraftText(buffer);
          if (parsed.rationale) {
            setDraftReason(parsed.rationale);
          }
          if (!draftDirtyRef.current && parsed.subject !== null) {
            setDraftSubject(parsed.subject);
          }
          if (!draftDirtyRef.current && parsed.draft) {
            setDraftBody(parsed.draft);
          }
        }

        buffer += decoder.decode();

        if (!cancelled && !draftDirtyRef.current) {
          router.refresh();
        }
      } catch {
        if (!cancelled) {
          setDraftReason(suggestion.reason);
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

    void loadDraft();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contact.id, currentDraft, draftDirty, router, storageKey, suggestion.goal, suggestion.reason]);

  const voiceSampleNudge =
    profile?.voice_samples?.length === 0 ? (
      <p className="mt-2 rounded-2xl border border-dashed border-[#d7d0c3] bg-[#fffaf1] px-4 py-3 text-sm text-[#6d665c]">
        Add 1 to 3 voice samples in Profile so Rolo can match your tone more closely.
      </p>
    ) : null;
  const personalizationSignals = profile?.voice_samples?.length
    ? "contact,company,history,voice samples"
    : "contact,company,history";

  return (
    <section className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f6f68]">Thread</p>
          <h2 className="mt-2 text-lg font-semibold">Reality first</h2>
        </div>
        {prepBrief ? (
          <Link className="text-sm font-medium text-[#1f6f68]" href={`/app/prep?contact_id=${contact.id}`}>
            Open brief
          </Link>
        ) : null}
      </div>

      <div className="mt-5 rounded-2xl border border-[#e3dacc] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">Suggested next message</p>
          {isGenerating ? <p className="text-xs text-[#1f6f68]">Drafting with your context…</p> : null}
        </div>
        <p className="mt-2 text-sm text-[#4b463d]">{draftReason}</p>
        {voiceSampleNudge}
        <form action={saveMessageDraft} className="mt-4 space-y-3">
          {currentDraft ? <input type="hidden" name="message_id" value={currentDraft.id} /> : null}
          <input type="hidden" name="contact_id" value={contact.id} />
          <input type="hidden" name="goal" value={currentDraft?.goal ?? suggestion.goal} />
          <input type="hidden" name="source" value={draftSource} />
          <input type="hidden" name="personalization_signals" value={personalizationSignals} />
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">Subject</span>
            <input
              name="subject"
              value={draftSubject}
              onChange={(event) => {
                setDraftSubject(event.target.value);
                setDraftDirty(true);
                setDraftSource("manual");
              }}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm"
              placeholder="Subject"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-[#6d665c]">Draft</span>
            <textarea
              name="body"
              value={draftBody}
              onChange={(event) => {
                setDraftBody(event.target.value);
                setDraftDirty(true);
                setDraftSource("manual");
              }}
              rows={10}
              className="mt-2 w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm leading-6"
            />
          </label>
          <SubmitButton label={currentDraft ? "Save changes" : "Use this"} pendingLabel="Saving..." />
        </form>
        {currentDraft ? (
          <form action={markMessageAsSent} className="mt-3">
            <input type="hidden" name="message_id" value={currentDraft.id} />
            <input type="hidden" name="contact_id" value={contact.id} />
            <SubmitButton label="Mark as sent" pendingLabel="Saving..." variant="secondary" />
          </form>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {threadEvents.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#c9c0b2] px-4 py-6 text-sm text-[#6d665c]">
            No thread events yet.
          </p>
        ) : (
          threadEvents.map((event: any, index: number) => {
            const previous = threadEvents[index - 1];
            const gapDays = previous ? daysBetween(previous.date, event.date) : null;
            return (
              <div key={event.id} className="space-y-3">
                {gapDays !== null && gapDays >= 7 ? (
                  <div className="text-center text-xs uppercase tracking-[0.18em] text-[#8b8378]">
                    Silent for {gapDays} days
                  </div>
                ) : null}
                <article className="rounded-2xl border border-[#e3dacc] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">
                      {event.kind === "message"
                        ? event.direction === "outbound"
                          ? event.status === "draft"
                            ? "Draft"
                            : "Sent"
                          : "Reply"
                        : event.interactionType.replace("_", " ")}
                    </p>
                    <p className="text-xs text-[#6d665c]">{formatDate(event.date)}</p>
                  </div>
                  {event.kind === "message" ? (
                    <div className="mt-3 space-y-2">
                      {event.subject ? <p className="text-sm font-medium">{event.subject}</p> : null}
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">{event.body}</p>
                      {event.direction === "outbound" && event.status === "draft" ? (
                        <form action={markMessageAsSent} className="mt-3">
                          <input type="hidden" name="message_id" value={event.id} />
                          <input type="hidden" name="contact_id" value={contact.id} />
                          <SubmitButton label="Mark as sent" pendingLabel="Saving..." variant="secondary" />
                        </form>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4b463d]">{event.summary}</p>
                  )}
                </article>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function OutreachChat({
  contact,
  chatMessages,
}: {
  contact: any;
  chatMessages: any[];
}) {
  const router = useRouter();
  const [messagesState, setMessagesState] = useState(chatMessages);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assistantIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMessagesState(chatMessages);
  }, [chatMessages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    setError(null);
    setContent("");
    setIsSending(true);

    const userId = `temp-user-${Date.now()}`;
    const assistantId = `temp-assistant-${Date.now()}`;
    assistantIdRef.current = assistantId;

    setMessagesState((current) => [
      ...current,
      {
        id: userId,
        role: "user",
        content: trimmed,
        created_at: new Date().toISOString(),
      },
      {
        id: assistantId,
        role: "assistant",
        content: "Thinking…",
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const response = await fetch("/api/ai/outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact_id: contact.id,
          mode: "chat",
          message: trimmed,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat generation failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessagesState((current) =>
          current.map((message) =>
            message.id === assistantIdRef.current ? { ...message, content: assistantText } : message,
          ),
        );
      }

      assistantText += decoder.decode();

    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send chat message.");
      setMessagesState((current) => current.filter((message) => message.id !== userId && message.id !== assistantId));
      setContent(trimmed);
    } finally {
      setIsSending(false);
      router.refresh();
    }
  }

  return (
    <aside className="rounded-3xl border border-[#d7d0c3] bg-[#fffbf4] p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f6f68]">Outreach chat</p>
      <h2 className="mt-2 text-lg font-semibold">Ask Rolo</h2>

      <div className="mt-5 space-y-3">
        {messagesState.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[#c9c0b2] px-4 py-6 text-sm text-[#6d665c]">
            Ask anything about {contact.name}'s relationship thread.
          </p>
        ) : (
          messagesState.map((message) => (
            <article
              key={message.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                message.role === "user" ? "ml-6 bg-[#e5f0ee]" : "mr-6 bg-white"
              }`}
            >
              <p className="mb-1 text-xs uppercase tracking-[0.14em] text-[#6d665c]">
                {message.role === "user" ? "You" : "Rolo"}
              </p>
              {message.content}
            </article>
          ))
        )}
      </div>

      {error ? <p className="mt-3 text-sm text-[#9a4d3c]">{error}</p> : null}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <textarea
          name="content"
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ask: should I ask for a referral yet?"
          className="w-full rounded-md border border-[#c9c0b2] px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={isSending}
          className="rounded-md border border-[#c9c0b2] px-4 py-2 text-sm font-semibold text-[#171512] transition hover:bg-[#eee7dc] disabled:cursor-not-allowed disabled:text-[#8b8378]"
        >
          {isSending ? "Sending..." : "Send to chat"}
        </button>
      </form>
    </aside>
  );
}
