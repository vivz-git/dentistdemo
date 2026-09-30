"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

type BoardStatus = "New" | "Replied" | "Qualified" | "Booked" | "Needs Human";

interface Row {
  time: string;
  name: string;
  interest: string;
  source: string;
  status: BoardStatus;
  next: string;
}

const TONE: Record<BoardStatus, string> = {
  New: "text-board-ink bg-board-line",
  Replied: "text-[#bcd0f5] bg-[#23324d]",
  Qualified: "text-[#d6c8f7] bg-[#302a4a]",
  Booked: "text-ink bg-signal",
  "Needs Human": "text-[#ffd2bd] bg-[#4a2a1c]",
};

// The row that plays out live, step by step.
const LIVE_STEPS: { status: BoardStatus; next: string }[] = [
  { status: "New", next: "Enquiry received" },
  { status: "Replied", next: "Answered in 0:21" },
  { status: "Qualified", next: "Prefers evenings" },
  { status: "Booked", next: "Thu, 6:00 pm" },
];

const SETTLED: Row[] = [
  { time: "8:47 pm", name: "Sneha K.", interest: "Clear aligners", source: "Instagram", status: "Qualified", next: "3 slots offered" },
  { time: "7:58 pm", name: "Arjun I.", interest: "Toothache", source: "WhatsApp", status: "Needs Human", next: "Front desk calling" },
  { time: "6:12 pm", name: "Karthik R.", interest: "Check-up", source: "Google", status: "Booked", next: "Sat, 10:30 am" },
  { time: "4:35 pm", name: "Divya S.", interest: "Whitening", source: "Instagram", status: "Replied", next: "Reminder in 22 h" },
];

const LIVE_PEOPLE = [
  { name: "Rahul M.", interest: "Dental implants", source: "Website" },
  { name: "Nivedita R.", interest: "Clear aligners", source: "Instagram" },
  { name: "Ishaan B.", interest: "Dental implants", source: "Google" },
];

export function LiveBoard() {
  const [step, setStep] = useState(0);
  const [person, setPerson] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setStep(LIVE_STEPS.length - 1);
      return;
    }
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= LIVE_STEPS.length - 1) {
          setPerson((p) => (p + 1) % LIVE_PEOPLE.length);
          return 0;
        }
        return s + 1;
      });
    }, 1900);
    return () => window.clearInterval(id);
  }, []);

  const live = LIVE_STEPS[step];
  const who = LIVE_PEOPLE[person];

  return (
    <figure className="overflow-hidden rounded-[10px] bg-board text-board-ink shadow-[0_24px_60px_-28px_rgba(20,24,31,0.55)]">
      <div className="flex items-center justify-between gap-3 border-b border-board-line px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-signal opacity-60 motion-reduce:hidden" />
            <span className="relative size-2 rounded-full bg-signal" />
          </span>
          <span className="board-type text-[13px] font-semibold uppercase tracking-[0.08em]">Enquiries tonight</span>
        </div>
        <span className="text-[11.5px] text-board-ink-2">SmileCare Dental Clinic · demo data</span>
      </div>

      <div className="hidden grid-cols-[64px_1.1fr_1.1fr_0.9fr_112px_1fr] gap-3 border-b border-board-line px-5 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-board-ink-2 sm:grid">
        <span>Time</span>
        <span>Patient</span>
        <span>Interest</span>
        <span>Source</span>
        <span>Status</span>
        <span>Next</span>
      </div>

      <ul className="divide-y divide-board-line" aria-live="polite">
        <BoardRow
          row={{ time: "9:12 pm", name: who.name, interest: who.interest, source: who.source, status: live.status, next: live.next }}
          flapKey={`${person}-${step}`}
          highlight
        />
        {SETTLED.map((r) => (
          <BoardRow key={r.name} row={r} />
        ))}
      </ul>

      <figcaption className="border-t border-board-line px-4 py-3 text-[12.5px] leading-relaxed text-board-ink-2 sm:px-5">
        The clinic closed at 7:30 pm. Every enquiry still got a reply in seconds, and the ones that need a person are waiting for the front desk in the morning.
      </figcaption>
    </figure>
  );
}

function BoardRow({ row, flapKey, highlight }: { row: Row; flapKey?: string; highlight?: boolean }) {
  return (
    <li
      className={clsx(
        "grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 text-[13.5px] sm:grid-cols-[64px_1.1fr_1.1fr_0.9fr_112px_1fr] sm:items-center sm:px-5",
        highlight && "bg-board-2",
      )}
    >
      <span className="tabular text-board-ink-2 max-sm:hidden">{row.time}</span>
      <span className="font-medium">
        {row.name}
        <span className="block text-[12px] font-normal text-board-ink-2 sm:hidden">
          {row.interest} · {row.source} · {row.time}
        </span>
      </span>
      <span className="max-sm:hidden">{row.interest}</span>
      <span className="text-board-ink-2 max-sm:hidden">{row.source}</span>
      <span className="max-sm:row-span-2 max-sm:self-center" style={{ perspective: 400 }}>
        <span key={flapKey} className={clsx("board-type inline-flex h-6 items-center rounded-[3px] px-2 text-[12px] font-semibold uppercase tracking-[0.06em]", TONE[row.status], flapKey && "flap")}>
          {row.status}
        </span>
      </span>
      <span key={flapKey ? `n-${flapKey}` : undefined} className={clsx("tabular text-board-ink-2 max-sm:text-[12px]", flapKey && "rise")}>
        {row.next}
      </span>
    </li>
  );
}
