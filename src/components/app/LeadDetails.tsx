"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle, Clock, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { availabilityInput } from "@/lib/ai/context";
import { pickSlotsToOffer, listOpenSlots } from "@/lib/booking/availability";
import { APPOINTMENT_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/domain/types";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { dayTime, formatDuration, relativeTime } from "@/lib/ui/format";

const FU_LABEL = {
  reminder_24h: "Reminder, 24 hours before",
  reminder_2h: "Reminder, 2 hours before",
  no_reply_nudge: "No-reply follow-up",
  post_consult_check: "Post-consultation check-in",
  reactivation: "Reactivation message",
} as const;

export function LeadDetails({ leadId }: { leadId: string }) {
  const data = useClinicData();
  const now = useNow();
  const lead = data.leads.find((l) => l.id === leadId)!;
  const store = useDemoStore.getState;
  const tz = data.clinic.timezone;
  const appt = data.appointments.find((a) => a.id === lead.appointmentId && a.status !== "cancelled");
  const followUps = data.followUps.filter((f) => f.leadId === leadId).sort((a, b) => Number(b.status === "scheduled") - Number(a.status === "scheduled") || b.dueAt.localeCompare(a.dueAt));
  const guardrails = data.messages.filter((m) => m.conversationId === data.conversations.find((c) => c.leadId === leadId)?.id && m.meta?.guardrail);
  const [booking, setBooking] = useState(false);

  const field = "h-9 w-full rounded-[6px] border border-line-strong bg-surface px-2.5 text-[13.5px] focus:border-ink focus:outline-none";

  return (
    <aside className="grid content-start gap-5 overflow-y-auto border-l border-line bg-surface p-5 text-[13.5px]" aria-label="Lead details">
      <div>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-2">Lead</h2>
        <dl className="mt-3 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
          <dt className="text-ink-3">Phone</dt>
          <dd className="tabular">{lead.phone}</dd>
          <dt className="text-ink-3">Email</dt>
          <dd className="truncate">{lead.email ?? "Not given"}</dd>
          <dt className="text-ink-3">Source</dt>
          <dd>{SOURCE_LABEL[lead.source]}</dd>
          <dt className="text-ink-3">Created</dt>
          <dd className="tabular">{dayTime(lead.createdAt, tz)}</dd>
          <dt className="text-ink-3">First reply</dt>
          <dd className="tabular">{formatDuration(lead.firstResponseSeconds)}</dd>
          <dt className="text-ink-3">Preferred time</dt>
          <dd className={lead.intake.preferredTime ? "capitalize" : "text-ink-3"}>{lead.intake.preferredTime ?? "Not yet asked"}</dd>
          {lead.intake.urgency && lead.intake.urgency !== "routine" && (
            <>
              <dt className="text-ink-3">Urgency</dt>
              <dd className="font-medium capitalize text-[var(--st-human)]">{lead.intake.urgency}</dd>
            </>
          )}
          {lead.reactivatedFromCampaignId && (
            <>
              <dt className="text-ink-3">Campaign</dt>
              <dd>{data.campaigns.find((c) => c.id === lead.reactivatedFromCampaignId)?.name}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-2">Status</span>
          <select className={field} value={lead.status} onChange={(e) => store().setLeadStatus(leadId, e.target.value as LeadStatus)}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-2">Service interest</span>
          <select
            className={field}
            value={lead.serviceId ?? ""}
            onChange={(e) => store().setLeadService(leadId, e.target.value)}
          >
            <option value="" disabled>
              Not yet known
            </option>
            {data.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-[12.5px] font-medium text-ink-2">Assigned to</span>
          <select className={field} value={lead.assignedToId ?? ""} onChange={(e) => store().assignLead(leadId, e.target.value)}>
            <option value="">Assistant (unassigned)</option>
            {data.staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-2">Appointment</h2>
        {appt ? (
          <div className="mt-3 rounded-[6px] border border-line bg-bg p-3">
            <div className="font-semibold tabular">{dayTime(appt.start, tz)}</div>
            <div className="mt-0.5 text-ink-2">
              {appt.consultationType} · {APPOINTMENT_LABEL[appt.status]} · booked by {appt.bookedBy === "ai" ? "assistant" : "staff"}
            </div>
            {new Date(appt.start) < now && appt.status !== "attended" && appt.status !== "no_show" && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => store().markAttended(appt.id, true)}>
                  <CheckCircle className="size-4" /> Attended
                </Button>
                <Button size="sm" variant="secondary" onClick={() => store().markAttended(appt.id, false)}>
                  <XCircle className="size-4" /> No-show
                </Button>
              </div>
            )}
            {new Date(appt.start) > now && (
              <button className="mt-2 text-[12.5px] text-ink-2 underline underline-offset-4 hover:text-ink" onClick={() => setBooking((b) => !b)}>
                Reschedule
              </button>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-ink-2">No consultation booked.</p>
            {lead.status !== "do_not_contact" && (
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => setBooking((b) => !b)}>
                <CalendarPlus className="size-4" /> Book for patient
              </Button>
            )}
          </div>
        )}
        {booking && <SlotPicker leadId={leadId} onDone={() => setBooking(false)} />}
      </div>

      <div className="border-t border-line pt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-2">Follow-ups</h2>
        {followUps.length === 0 ? (
          <p className="mt-3 text-ink-2">None scheduled.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {followUps.map((f) => (
              <li key={f.id} className="flex items-start gap-2.5">
                <Clock className={clsx("mt-0.5 size-4 shrink-0", f.status === "scheduled" ? "text-ink" : "text-ink-3")} />
                <div className="min-w-0">
                  <div className={clsx(f.status === "cancelled" && "text-ink-3 line-through")}>{FU_LABEL[f.kind]}</div>
                  <div className="text-[12px] text-ink-3 tabular">
                    {f.status === "scheduled" ? `Scheduled ${relativeTime(f.dueAt, now)}` : f.status === "sent" ? `Sent ${relativeTime(f.dueAt, now)}` : "Cancelled"} · {f.channel === "whatsapp" ? "WhatsApp" : f.channel}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {guardrails.length > 0 && (
        <div className="border-t border-line pt-5">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-2">
            <ShieldCheck className="size-4" /> Guardrails
          </h2>
          <ul className="mt-3 grid gap-1.5 text-ink-2">
            {guardrails.map((m) => (
              <li key={m.id}>
                {m.meta?.guardrail === "inbound_emergency"
                  ? "Possible emergency: fixed safety reply, escalated"
                  : m.meta?.guardrail === "inbound_clinical"
                    ? "Clinical question: not answered, escalated"
                    : m.meta?.guardrail === "inbound_opt_out"
                      ? "Opt-out recorded"
                      : "Model reply replaced by safe reply"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

function SlotPicker({ leadId, onDone }: { leadId: string; onDone: () => void }) {
  const data = useClinicData();
  const slots = useMemo(() => {
    const all = listOpenSlots(availabilityInput(data, new Date()));
    return pickSlotsToOffer(all, 8, "any", data.clinic.timezone);
  }, [data]);
  return (
    <div className="mt-3 grid gap-1.5">
      <p className="text-[12.5px] text-ink-2">Next open times from clinic hours and the diary:</p>
      {slots.map((s) => (
        <button
          key={s.start}
          className="rounded-[6px] border border-line-strong px-3 py-2 text-left tabular hover:border-ink hover:bg-surface-2"
          onClick={() => {
            const r = useDemoStore.getState().bookSlot(leadId, s, "staff");
            if (r.ok) onDone();
          }}
        >
          {s.label}
        </button>
      ))}
      {slots.length === 0 && <p className="text-ink-2">No open times in the booking window.</p>}
    </div>
  );
}
