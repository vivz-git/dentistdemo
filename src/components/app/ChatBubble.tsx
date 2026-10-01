import clsx from "clsx";
import type { MessageAuthor, MessageKind, SlotRef } from "@/lib/domain/types";

const AUTHOR_LABEL: Record<MessageAuthor, string> = {
  patient: "Patient",
  ai: "Assistant",
  staff: "Staff",
  system: "System",
};

export interface BubbleProps {
  author: MessageAuthor;
  kind?: MessageKind;
  body: string;
  time?: string;
  authorName?: string;
  slots?: SlotRef[];
  /** When set, slot buttons are clickable (patient simulator). */
  onPickSlot?: (slot: SlotRef) => void;
  pickable?: boolean;
  meta?: string;
  className?: string;
}

/**
 * One message. Author is always named in text (Assistant / Staff / System),
 * never signalled by colour or side alone.
 */
export function ChatBubble({ author, kind = "text", body, time, authorName, slots, onPickSlot, pickable, meta, className }: BubbleProps) {
  if (author === "system") {
    return (
      <div className={clsx("flex items-center gap-3 py-1 text-[12px] text-ink-3", className)}>
        <span className="h-px flex-1 bg-line" />
        <span className="max-w-[80%] text-center">
          <span className="font-semibold text-ink-2">System</span> · {body}
          {time && <span className="tabular"> · {time}</span>}
        </span>
        <span className="h-px flex-1 bg-line" />
      </div>
    );
  }

  if (kind === "internal_note") {
    return (
      <div className={clsx("ml-auto w-full max-w-[520px] rounded-[6px] border border-dashed border-[#e0c47c] bg-signal-wash px-3.5 py-2.5 text-[13.5px] text-ink", className)}>
        <div className="mb-1 flex items-center gap-2 text-[11.5px] font-semibold text-ink-2">
          Internal note{authorName ? ` · ${authorName}` : ""} <span className="font-normal text-ink-3">Not visible to patient</span>
          {time && <span className="ml-auto tabular font-normal text-ink-3">{time}</span>}
        </div>
        <p className="whitespace-pre-line">{body}</p>
      </div>
    );
  }

  const outgoing = author !== "patient";
  const listed = slots?.length ? body.split("\n").filter((l) => !/^\d\.\s/.test(l)) : null;

  return (
    <div className={clsx("flex w-full flex-col", outgoing ? "items-end" : "items-start", className)}>
      <div className={clsx("mb-1 flex items-center gap-2 px-1 text-[11.5px]", outgoing ? "flex-row-reverse" : "")}>
        <span
          className={clsx(
            "rounded-[3px] px-1.5 py-px font-semibold",
            author === "ai" && "bg-ink text-white",
            author === "staff" && "bg-[var(--st-qualified-wash)] text-[var(--st-qualified)]",
            author === "patient" && "bg-surface-3 text-ink-2",
          )}
        >
          {author === "staff" && authorName ? `Staff · ${authorName}` : AUTHOR_LABEL[author]}
        </span>
        {time && <span className="tabular text-ink-3">{time}</span>}
        {meta && <span className="text-ink-3">{meta}</span>}
      </div>
      <div
        className={clsx(
          "max-w-[min(560px,88%)] rounded-[10px] px-3.5 py-2.5 text-[14px] leading-[1.5]",
          author === "patient" && "rounded-tl-[3px] border border-line bg-surface text-ink",
          author === "ai" && "rounded-tr-[3px] bg-[#e8edf5] text-ink",
          author === "staff" && "rounded-tr-[3px] bg-[#efeaf8] text-ink",
          kind === "escalation" && "border border-[#f0c7ad] !bg-[var(--st-human-wash)]",
          kind === "booking_confirmation" && "border border-[#b9dcc6] !bg-[var(--st-booked-wash)]",
        )}
      >
        {kind === "booking_confirmation" && <div className="mb-1 text-[12px] font-semibold text-[var(--st-booked)]">Booking confirmed</div>}
        {kind === "escalation" && <div className="mb-1 text-[12px] font-semibold text-[var(--st-human)]">Handed to clinic staff</div>}
        {kind === "reminder" && <div className="mb-1 text-[12px] font-semibold text-ink-2">Automated follow-up</div>}
        <p className="whitespace-pre-line">{listed ? listed.join("\n").trim() : body}</p>
        {slots && slots.length > 0 && (
          <div className="mt-2.5 grid gap-1.5">
            {slots.map((s, i) => {
              const inner = (
                <>
                  <span className="grid size-5 place-items-center rounded-[3px] bg-surface-3 text-[11px] font-semibold">{i + 1}</span>
                  {s.label}
                </>
              );
              const cls = "flex items-center gap-2.5 rounded-[6px] border bg-surface px-3 py-2 text-left text-[13.5px] tabular transition-colors";
              return onPickSlot && pickable ? (
                <button key={s.start} type="button" onClick={() => onPickSlot(s)} className={clsx(cls, "border-line-strong hover:border-ink hover:bg-surface-2")}>
                  {inner}
                </button>
              ) : (
                <div key={s.start} className={clsx(cls, "border-line")}>
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <div className="flex flex-col items-end">
      <div className="mb-1 px-1 text-[11.5px]">
        <span className="rounded-[3px] bg-ink px-1.5 py-px font-semibold text-white">Assistant</span>
      </div>
      <div className="flex gap-1 rounded-[10px] rounded-tr-[3px] bg-[#e8edf5] px-4 py-3" aria-label="Assistant is typing">
        <span className="typing-dot size-1.5 rounded-full bg-ink-2" />
        <span className="typing-dot size-1.5 rounded-full bg-ink-2" />
        <span className="typing-dot size-1.5 rounded-full bg-ink-2" />
      </div>
    </div>
  );
}
