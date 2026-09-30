"use client";

import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowBendUpLeft, Note, PaperPlaneRight, Phone, Robot, UserCircle } from "@phosphor-icons/react";
import { ChatBubble, TypingBubble } from "@/components/app/ChatBubble";
import { Button } from "@/components/ui/Button";
import { StatusChip } from "@/components/ui/StatusChip";
import { CHANNEL_LABEL } from "@/lib/domain/labels";
import type { SlotRef } from "@/lib/domain/types";
import { PATIENT_QUICK_REPLIES } from "@/lib/demo/prospects";
import { useClinicData } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { clock, shortDate } from "@/lib/ui/format";
import { staffName } from "@/lib/ui/leadInfo";

type ComposerMode = "patient" | "staff" | "note";

export function Conversation({ leadId }: { leadId: string }) {
  const data = useClinicData();
  const lead = data.leads.find((l) => l.id === leadId)!;
  const convo = data.conversations.find((c) => c.leadId === leadId)!;
  const typing = useDemoStore((s) => s.typing[leadId]);
  const store = useDemoStore.getState;
  const tz = data.clinic.timezone;
  const [mode, setMode] = useState<ComposerMode>(convo.mode === "human" ? "staff" : "patient");
  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => data.messages.filter((m) => m.conversationId === convo.id), [data.messages, convo.id]);
  const lastOffer = [...messages].reverse().find((m) => m.slots?.length);
  const booked = lead.status === "booked" || lead.status === "attended";
  const optedOut = lead.status === "do_not_contact";
  const awaitingFirstReply = lead.status === "new" && !messages.some((m) => m.author === "ai" || m.author === "staff");

  useEffect(() => {
    store().markRead(leadId);
  }, [leadId, messages.length, store]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  function send(body = text) {
    const t = body.trim();
    if (!t) return;
    if (mode === "patient") void store().sendPatientMessage(leadId, t);
    else if (mode === "staff") store().sendStaffMessage(leadId, t);
    else store().addNote(leadId, t);
    setText("");
  }

  function pickSlot(slot: SlotRef) {
    // Simulates the patient tapping a time in WhatsApp.
    store().sendPatientMessage(leadId, slot.label);
  }

  const dayBreaks = messages.map((m, i) => (i === 0 || shortDate(m.createdAt, tz) !== shortDate(messages[i - 1].createdAt, tz) ? shortDate(m.createdAt, tz) : null));
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg" aria-label={`Conversation with ${lead.name}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-[17px] font-semibold">{lead.name}</h1>
            <StatusChip status={lead.status} key={lead.status} animate />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[12.5px] text-ink-2">
            <span>{CHANNEL_LABEL[convo.channel]}</span>
            <span className="tabular">{lead.phone}</span>
            <ModeBadge mode={convo.mode} who={convo.takenOverById ? staffName(data, convo.takenOverById) : undefined} />
          </div>
        </div>
        {!optedOut &&
          (convo.mode === "ai" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                store().takeOver(leadId);
                setMode("staff");
              }}
            >
              <UserCircle className="size-4" /> Take Over
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                store().returnToAI(leadId);
                setMode("patient");
              }}
            >
              <Robot className="size-4" /> Return to AI
            </Button>
          ))}
      </div>

      {/* Messages */}
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto grid max-w-[760px] gap-4">
          {messages.map((m, i) => {
            const day = dayBreaks[i];
            const isLatestOffer = m.id === lastOffer?.id;
            return (
              <div key={m.id} className="grid gap-4">
                {day && <div className="text-center text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-3">{day}</div>}
                <ChatBubble
                  author={m.author}
                  kind={m.kind}
                  body={m.body}
                  time={clock(m.createdAt, tz)}
                  authorName={m.authorId ? staffName(data, m.authorId) : undefined}
                  slots={m.slots}
                  pickable={isLatestOffer && !booked && convo.mode === "ai" && !optedOut}
                  onPickSlot={pickSlot}
                  meta={m.author === "ai" && m.meta?.guardrail ? "Guardrail applied" : m.author === "ai" && m.meta?.faqId ? "Answered from FAQ" : undefined}
                />
              </div>
            );
          })}
          {typing && <TypingBubble />}
          {awaitingFirstReply && (
            <div className="rounded-[8px] border border-line bg-surface p-4">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-ink-2" />
                <div className="flex-1">
                  <p className="text-[14px] font-medium">{lead.source === "phone" ? "Missed call with no reply yet." : "This enquiry hasn't had a reply yet."}</p>
                  <p className="mt-1 text-[13px] text-ink-2">ConsultFlow can send an instant WhatsApp follow-up now, or your team can call back.</p>
                </div>
                <Button size="sm" variant="primary" onClick={() => store().startAiFollowUp(leadId)} disabled={typing}>
                  Start AI follow-up
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface px-4 pb-4 pt-3 sm:px-5">
        <div className="mx-auto max-w-[760px]">
          {optedOut ? (
            <p className="py-2 text-[13.5px] text-ink-2">This person opted out. ConsultFlow will not message them again. You can still add an internal note from the lead details.</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center gap-1" role="tablist" aria-label="Reply as">
                {(
                  [
                    ["patient", "Reply as patient (demo)", ArrowBendUpLeft, "Patient (demo)"],
                    ["staff", "Reply as staff", UserCircle, "Staff"],
                    ["note", "Internal note", Note, "Note"],
                  ] as const
                ).map(([k, label, Icon, short]) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={mode === k}
                    onClick={() => setMode(k)}
                    className={clsx("flex h-8 items-center gap-1.5 rounded-[6px] px-2.5 text-[12.5px]", mode === k ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface-2")}
                  >
                    <Icon className="size-3.5" /> <span className="max-sm:hidden">{label}</span>
                    <span className="sm:hidden">{short}</span>
                  </button>
                ))}
              </div>
              {mode === "patient" && (
                <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
                  {PATIENT_QUICK_REPLIES.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={typing}
                      className="h-7 shrink-0 rounded-[6px] border border-line-strong bg-bg px-2.5 text-[12.5px] text-ink-2 hover:border-ink hover:text-ink disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2"
              >
                <label className="flex-1">
                  <span className="sr-only">Message</span>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    placeholder={
                      mode === "patient" ? "Type what the patient would send" : mode === "staff" ? "Message the patient as clinic staff" : "Visible to staff only"
                    }
                    className={clsx(
                      "block max-h-40 min-h-11 w-full resize-y rounded-[6px] border px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none",
                      mode === "note" ? "border-[#e0c47c] bg-signal-wash" : "border-line-strong bg-surface",
                    )}
                  />
                </label>
                <Button type="submit" variant="primary" className="h-11" disabled={!text.trim()} aria-label="Send">
                  <PaperPlaneRight className="size-4" weight="fill" />
                  <span className="max-sm:hidden">{mode === "note" ? "Add note" : "Send"}</span>
                </Button>
              </form>
              <p className="mt-2 text-[11.5px] text-ink-3">
                {mode === "patient"
                  ? convo.mode === "ai"
                    ? "Demo control: plays the patient's side. The assistant replies automatically."
                    : "Demo control: plays the patient's side. The assistant is paused while staff handle this chat."
                  : mode === "staff"
                    ? "Sending as staff pauses the assistant for this conversation. Simulated, not sent."
                    : "Notes are never shown to the patient."}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ModeBadge({ mode, who }: { mode: "ai" | "human"; who?: string }) {
  return mode === "ai" ? (
    <span className="inline-flex items-center gap-1 font-medium text-ink">
      <Robot className="size-3.5" /> Assistant handling
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-medium text-[var(--st-human)]">
      <UserCircle className="size-3.5" /> {who ? `${who} handling` : "Waiting for staff"}
    </span>
  );
}
