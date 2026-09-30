"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { DemoTag } from "@/components/ui/DemoTag";
import { availabilityInput, hoursSummary } from "@/lib/ai/context";
import { listOpenSlots } from "@/lib/booking/availability";
import { APPOINTMENT_LABEL } from "@/lib/domain/labels";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { dateKey, formatInZone } from "@/lib/time";
import { clock } from "@/lib/ui/format";

type Tab = "upcoming" | "past";

export default function AppointmentsPage() {
  const data = useClinicData();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("upcoming");
  const tz = data.clinic.timezone;
  const markAttended = useDemoStore((s) => s.markAttended);

  const appts = data.appointments
    .filter((a) => a.status !== "cancelled")
    .filter((a) => (tab === "upcoming" ? new Date(a.end) >= now : new Date(a.end) < now))
    .sort((a, b) => (tab === "upcoming" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));

  const groups = new Map<string, typeof appts>();
  for (const a of appts) {
    const k = dateKey(new Date(a.start), tz);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }

  const openCount = useMemo(() => listOpenSlots(availabilityInput(data, now)).length, [data, now]);
  const rules = data.clinic.booking;

  return (
    <div className="pb-16">
      <PageHeader
        title="Appointments"
        description={
          <>
            Consultations booked through ConsultFlow, by the assistant or your team. <DemoTag className="ml-1 align-middle" />
          </>
        }
      />
      <div className="grid gap-6 px-4 pt-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-4">
          <div className="flex gap-1" role="tablist">
            {(["upcoming", "past"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={clsx("h-8 rounded-[6px] px-3 text-[13.5px] capitalize", tab === t ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface-2")}
              >
                {t}
              </button>
            ))}
          </div>

          {appts.length === 0 && (
            <div className="rounded-[8px] border border-dashed border-line-strong px-6 py-10 text-center text-ink-2">
              No {tab} consultations. Simulate an enquiry and book a time to see one appear here.
            </div>
          )}

          {[...groups.entries()].map(([day, list]) => (
            <section key={day} className="overflow-hidden rounded-[8px] border border-line bg-surface">
              <h2 className="border-b border-line bg-surface-2 px-4 py-2 text-[13px] font-semibold">
                {formatInZone(list[0].start, tz, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <ul className="divide-y divide-line">
                {list.map((a) => {
                  const lead = data.leads.find((l) => l.id === a.leadId);
                  const svc = data.services.find((s) => s.id === a.serviceId);
                  const reminders = data.followUps.filter((f) => f.appointmentId === a.id);
                  const pending = reminders.filter((f) => f.status === "scheduled").length;
                  return (
                    <li key={a.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                      <span className="text-[15px] font-semibold tabular">{clock(a.start, tz)}</span>
                      <div className="min-w-0">
                        <Link href={`/app/inbox/${a.leadId}`} className="text-[14.5px] font-medium hover:underline">
                          {lead?.name}
                        </Link>
                        <div className="text-[12.5px] text-ink-2">
                          {a.consultationType}
                          {svc ? ` · ${svc.name}` : ""} · booked by {a.bookedBy === "ai" ? "assistant" : "staff"}
                          {lead?.reactivatedFromCampaignId ? " · recovered by reactivation" : ""}
                        </div>
                        <div className="text-[12px] text-ink-3">{pending > 0 ? `${pending} reminder${pending > 1 ? "s" : ""} scheduled` : reminders.length ? "Reminders sent" : "No reminders"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-[4px] bg-surface-2 px-2 py-1 text-[12px] font-medium text-ink-2">{APPOINTMENT_LABEL[a.status]}</span>
                        {tab === "past" && (a.status === "scheduled" || a.status === "confirmed") && (
                          <>
                            <Button size="sm" variant="primary" onClick={() => markAttended(a.id, true)}>
                              Attended
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => markAttended(a.id, false)}>
                              No-show
                            </Button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-[8px] border border-line bg-surface p-4 text-[13.5px]">
            <h2 className="text-[14px] font-semibold">Booking rules</h2>
            <dl className="mt-3 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
              <dt className="text-ink-3">Consultation</dt>
              <dd>{rules.consultationMinutes} minutes</dd>
              <dt className="text-ink-3">Minimum notice</dt>
              <dd>{rules.minNoticeHours} hours</dd>
              <dt className="text-ink-3">Booking window</dt>
              <dd>{rules.maxDaysAhead} days ahead</dd>
              <dt className="text-ink-3">Hours</dt>
              <dd className="leading-relaxed">{hoursSummary(rules)}</dd>
              <dt className="text-ink-3">Closed</dt>
              <dd>{rules.blackoutDates.length ? rules.blackoutDates.map((d) => formatInZone(`${d}T06:30:00Z`, tz, { day: "numeric", month: "short" })).join(", ") : "No blackout dates"}</dd>
            </dl>
            <Link href="/app/settings" className="mt-3 inline-block text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink">
              Edit in clinic settings
            </Link>
          </section>
          <section className="rounded-[8px] bg-board p-4 text-board-ink">
            <div className="board-type text-[34px] font-semibold leading-none tabular">{openCount}</div>
            <p className="mt-2 text-[13px] text-board-ink-2">
              open consultation slots in the next {rules.maxDaysAhead} days, after existing diary entries. The assistant only ever offers these.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
