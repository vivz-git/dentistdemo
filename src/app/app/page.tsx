"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Lightning, Phone, WarningCircle, X } from "@phosphor-icons/react";
import { FunnelChart } from "@/components/app/FunnelChart";
import { PageHeader } from "@/components/app/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { DemoTag } from "@/components/ui/DemoTag";
import { StatusChip } from "@/components/ui/StatusChip";
import { dashboardKpis, funnel, leadsInWindow, pct } from "@/lib/analytics/metrics";
import { SOURCE_LABEL } from "@/lib/domain/labels";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { dayTime, formatDuration, relativeTime } from "@/lib/ui/format";
import { nextStep, serviceName } from "@/lib/ui/leadInfo";

export default function DashboardPage() {
  const data = useClinicData();
  const now = useNow(15_000);
  const router = useRouter();
  const k = dashboardKpis(data, now);
  const f = funnel(leadsInWindow(data, now, 30));
  const tz = data.clinic.timezone;
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const attention = data.leads
    .filter((l) => l.status === "needs_human" || l.status === "new")
    .sort((a, b) => (a.intake.urgency === "urgent" ? -1 : 0) - (b.intake.urgency === "urgent" ? -1 : 0) || b.createdAt.localeCompare(a.createdAt));
  const recent = [...data.leads].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt)).slice(0, 8);
  const upcoming = data.appointments
    .filter((a) => new Date(a.start) > now && a.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5);

  function simulate() {
    const id = useDemoStore.getState().simulateEnquiry();
    router.push(`/app/inbox/${id}`);
  }

  return (
    <div className="pb-16">
      <PageHeader
        title={`${greeting}, Priya`}
        description={
          <>
            How {data.clinic.name}&apos;s enquiries are converting over the last 30 days. <DemoTag className="ml-1 align-middle" />
          </>
        }
        actions={
          <ButtonLink href="/app/analytics" variant="secondary" size="sm">
            Full analytics
          </ButtonLink>
        }
      />

      <div className="grid gap-6 px-4 pt-6 sm:px-6">
        <TryIt onSimulate={simulate} />

        {/* KPI strip: one ruled board, not a row of cards */}
        <section aria-label="Key numbers" className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-line bg-surface md:grid-cols-4">
          <Kpi label="New enquiries today" value={k.enquiriesToday} hint={`${k.enquiriesYesterday} yesterday`} />
          <Kpi label="Response rate" value={`${Math.round(k.responseRate)}%`} hint={`Median first reply ${formatDuration(k.medianResponseSeconds)}`} />
          <Kpi label="Booked consultations" value={k.booked} hint={`${k.upcomingConsultations} upcoming in the diary`} />
          <Kpi label="Booking conversion" value={`${k.bookingRate.toFixed(1)}%`} hint="Booked ÷ enquiries, 30 days" />
          <Kpi label="Pending follow-ups" value={k.pendingFollowUps} hint="Reminders and nudges scheduled" />
          <Kpi label="Reactivated leads" value={k.reactivatedLeads} hint={`${k.recoveredConsultations} consultations recovered`} />
          <Kpi label="Missed opportunities" value={k.missed.total} hint={`${k.missed.needsHuman} need a person · ${k.missed.lost} lost`} tone={k.missed.needsHuman + k.missed.unanswered > 0 ? "warn" : undefined} />
          <Kpi label="Leads in the last 30 days" value={f.enquiries} hint={`${f.attended} consultations attended`} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <section className="rounded-[8px] border border-line bg-surface p-5">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[16px] font-semibold">Conversion funnel, last 30 days</h2>
              <span className="text-[12.5px] text-ink-3">
                {pct(f.booked, f.enquiries).toFixed(1)}% of enquiries booked a consultation
              </span>
            </div>
            <FunnelChart counts={f} />
          </section>

          <section className="rounded-[8px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="flex items-center gap-2 text-[16px] font-semibold">
                <WarningCircle className="size-5 text-[var(--st-human)]" weight="fill" /> Needs attention
              </h2>
              <span className="text-[12.5px] text-ink-3 tabular">{attention.length} open</span>
            </div>
            {attention.length === 0 ? (
              <p className="px-5 py-8 text-[14px] text-ink-2">Nothing waiting. Every enquiry has a reply and nothing is escalated.</p>
            ) : (
              <ul className="divide-y divide-line">
                {attention.slice(0, 6).map((l) => (
                  <li key={l.id}>
                    <Link href={`/app/inbox/${l.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <span className={clsx("grid size-8 shrink-0 place-items-center rounded-[6px]", l.status === "new" ? "bg-[var(--st-new-wash)] text-[var(--st-new)]" : "bg-[var(--st-human-wash)] text-[var(--st-human)]")}>
                        {l.status === "new" ? <Phone className="size-4" /> : <WarningCircle className="size-4" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium">{l.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-2">{nextStep(l, data, now)}</span>
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-3 tabular">{relativeTime(l.lastActivityAt, now)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[8px] bg-board text-board-ink">
            <div className="flex items-center justify-between gap-3 border-b border-board-line px-5 py-3.5">
              <h2 className="board-type text-[14px] font-semibold uppercase tracking-[0.08em]">Latest activity</h2>
              <Link href="/app/inbox" className="flex items-center gap-1 text-[12.5px] text-board-ink-2 hover:text-board-ink">
                Open inbox <ArrowRight className="size-3.5" />
              </Link>
            </div>
            <ul className="divide-y divide-board-line">
              {recent.map((l) => (
                <li key={l.id}>
                  <Link href={`/app/inbox/${l.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-board-2 md:grid-cols-[72px_1.2fr_1fr_130px_1.3fr]">
                    <span className="tabular text-[12.5px] text-board-ink-2 max-md:hidden">{relativeTime(l.lastActivityAt, now)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{l.name}</span>
                      <span className="block truncate text-[12px] text-board-ink-2">
                        <span className="md:hidden">{serviceName(data, l.serviceId)} · </span>
                        {SOURCE_LABEL[l.source]}
                      </span>
                    </span>
                    <span className="truncate text-[13px] text-board-ink-2 max-md:hidden">{serviceName(data, l.serviceId)}</span>
                    <span className="max-md:row-span-2 max-md:self-center">
                      <StatusChip status={l.status} key={l.status} animate />
                    </span>
                    <span className="truncate text-[12.5px] text-board-ink-2 tabular">{nextStep(l, data, now)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[8px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[16px] font-semibold">Upcoming consultations</h2>
              <Link href="/app/appointments" className="text-[12.5px] text-ink-2 hover:text-ink">
                All appointments
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {upcoming.map((a) => {
                const lead = data.leads.find((l) => l.id === a.leadId);
                const reminders = data.followUps.filter((fu) => fu.appointmentId === a.id && fu.status === "scheduled").length;
                return (
                  <li key={a.id}>
                    <Link href={`/app/inbox/${a.leadId}`} className="block px-5 py-3 hover:bg-surface-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-medium">{lead?.name}</span>
                        <span className="shrink-0 text-[12.5px] font-medium tabular">{dayTime(a.start, tz)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-3 text-[12.5px] text-ink-2">
                        <span className="truncate">{a.consultationType}</span>
                        <span className="shrink-0">{reminders > 0 ? `${reminders} reminder${reminders > 1 ? "s" : ""} scheduled` : "Reminders sent"}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: "warn" }) {
  return (
    <div className="border-b border-r border-line px-4 py-4 sm:px-5 [&:nth-child(2n)]:border-r-0 md:[&:nth-child(2n)]:border-r md:[&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+2)]:border-b-0 md:[&:nth-last-child(-n+4)]:border-b-0">
      <div className="text-[12.5px] font-medium text-ink-2">{label}</div>
      <div key={String(value)} className={clsx("rise board-type mt-1.5 text-[30px] font-semibold leading-none tabular", tone === "warn" && "text-[var(--st-human)]")}>
        {value}
      </div>
      <div className="mt-2 text-[12px] text-ink-3">{hint}</div>
    </div>
  );
}

function TryIt({ onSimulate }: { onSimulate: () => void }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <section className="relative grid gap-4 rounded-[8px] border border-[#ecd28f] bg-signal-wash px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <Lightning weight="fill" className="size-4" /> See a lead convert in under a minute
        </h2>
        <ol className="mt-2 grid gap-x-6 gap-y-1 text-[13.5px] text-ink-2 sm:grid-cols-2 xl:grid-cols-4">
          <li>1. Simulate a new enquiry</li>
          <li>2. Watch the assistant reply instantly</li>
          <li>3. Reply as the patient and pick a time</li>
          <li>4. Come back here: the booking is counted</li>
        </ol>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onSimulate}>
          Simulate new enquiry <ArrowRight weight="bold" className="size-4" />
        </Button>
      </div>
      <button onClick={() => setHidden(true)} className="absolute right-2 top-2 grid size-7 place-items-center rounded-[4px] text-ink-3 hover:bg-[#f6e3b3] hover:text-ink" aria-label="Hide tip">
        <X className="size-3.5" />
      </button>
    </section>
  );
}
