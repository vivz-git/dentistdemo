import clsx from "clsx";
import { STATUS_LABEL, STATUS_TONE } from "@/lib/domain/labels";
import type { LeadStatus } from "@/lib/domain/types";

/** Status is never colour alone: every chip carries its label and a shape key. */
export function StatusChip({ status, className, animate }: { status: LeadStatus; className?: string; animate?: boolean }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={clsx("inline-flex h-6 items-center gap-1.5 rounded-[4px] px-2 text-[12px] font-semibold board-type whitespace-nowrap", animate && "flap", className)}
      style={{ background: `var(--st-${tone}-wash)`, color: `var(--st-${tone})` }}
    >
      <span aria-hidden className="size-1.5 rounded-[1px]" style={{ background: `var(--st-${tone})` }} />
      {STATUS_LABEL[status]}
    </span>
  );
}
