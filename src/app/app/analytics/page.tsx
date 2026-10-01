"use client";

import clsx from "clsx";
import { useState } from "react";
import { DailyChart } from "@/components/app/DailyChart";
import { FunnelChart } from "@/components/app/FunnelChart";
import { PageHeader } from "@/components/app/PageHeader";
import { DemoTag } from "@/components/ui/DemoTag";
import { byService, bySource, dailySeries, funnel, inr, leadsInWindow, median, pct, revenueEstimate } from "@/lib/analytics/metrics";
import { SOURCE_LABEL } from "@/lib/domain/labels";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { formatDuration } from "@/lib/ui/format";
import { serviceName } from "@/lib/ui/leadInfo";

const PERIODS = [7, 30, 90] as const;

export default function AnalyticsPage() {
  const data = useClinicData();
  const now = useNow();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const leads = leadsInWindow(data, now, days);
  const f = funnel(leads);
  const lost = leads.filter((l) => l.status === "lost").length;
  const reactivated = data.leads.filter((l) => l.reactivatedFromCampaignId);
  const messaged = data.recipients.length;
  const recovered = reactivated.filter((l) => l.milestones.bookedAt).length;
  const rev = revenueEstimate(data, leads);
  const recoveredRev = revenueEstimate(data, reactivated);
  const respTimes = leads.map((l) => l.firstResponseSeconds).filter((x): x is number => typeof x === "number");

  return (
    <div className="pb-16">
      <PageHeader
        title="Analytics"
        description={
          <>
            Conversion performance for {data.clinic.name}. <DemoTag className="ml-1 align-middle" />
          </>
        }
        actions={
          <div className="flex gap-1 rounded-[6px] border border-line bg-surface p-0.5" role="radiogroup" aria-label="Period">
            {PERIODS.map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={days === p}
                onClick={() => setDays(p)}
                className={clsx("h-7 rounded-[4px] px-3 text-[13px]", days === p ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface-2")}
              >
                {p} days
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-6 px-4 pt-5 sm:px-6">
        <section className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-line bg-surface sm:grid-cols-3 xl:grid-cols-5" aria-label="Rates">
          <Metric label="Enquiries" value={f.enquiries} />
          <Metric label="Median first response" value={formatDuration(median(respTimes))} />
          <Metric label="Contacted" value={`${pct(f.contacted, f.enquiries).toFixed(0)}%`} />
          <Metric label="Qualified" value={`${pct(f.qualified, f.enquiries).toFixed(0)}%`} />
          <Metric label="Booked" value={`${pct(f.booked, f.enquiries).toFixed(1)}%`} />
          <Metric label="Attended" value={`${pct(f.attended, f.enquiries).toFixed(1)}%`} />
          <Metric label="Lost" value={`${pct(lost, f.enquiries).toFixed(0)}%`} />
          <Metric label="Reactivated" value={`${pct(reactivated.length, messaged).toFixed(0)}%`} hint="Re-engaged ÷ messaged" />
          <Metric label="Recovered consultations" value={recovered} />
          <Metric label="Est. consultation value" value={inr(rev.consultationFees)} hint="Estimate" />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-[8px] border border-line bg-surface p-5">
            <h2 className="mb-4 text-[16px] font-semibold">Enquiries and bookings per day</h2>
            <DailyChart points={dailySeries(data, now, Math.min(days, 30))} />
            {days > 30 && <p className="mt-2 text-[12px] text-ink-3">Daily view shows the most recent 30 days.</p>}
          </section>
          <section className="rounded-[8px] border border-line bg-surface p-5">
            <h2 className="mb-4 text-[16px] font-semibold">Conversion funnel</h2>
            <FunnelChart counts={f} compact />
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Breakdown title="By source" rows={bySource(leads).map((r) => ({ label: SOURCE_LABEL[r.key], enquiries: r.enquiries, booked: r.booked }))} />
          <Breakdown title="By service" rows={byService(leads).map((r) => ({ label: serviceName(data, r.key === "unknown" ? undefined : r.key), enquiries: r.enquiries, booked: r.booked }))} />
        </div>

        <RevenuePanel bookedFees={rev.consultationFees} opportunity={rev.treatmentOpportunity} bookedCount={rev.bookedCount} recoveredOpportunity={recoveredRev.treatmentOpportunity} recovered={recovered} currentRate={pct(f.booked, f.enquiries)} days={days} />
      </div>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="border-b border-r border-line px-4 py-3.5">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div className="board-type mt-1 text-[24px] font-semibold leading-none tabular">{value}</div>
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; enquiries: number; booked: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.enquiries));
  return (
    <section className="rounded-[8px] border border-line bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        <div className="flex items-center gap-3 text-[12px] text-ink-2">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-series-1" aria-hidden /> Enquiries
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[2px] bg-series-2" aria-hidden /> Booked
          </span>
        </div>
      </div>
      <table className="w-full text-[13.5px]">
        <thead className="sr-only">
          <tr>
            <th>{title}</th>
            <th>Bars</th>
            <th>Enquiries</th>
            <th>Booked</th>
            <th>Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} title={`${r.label}: ${r.enquiries} enquiries, ${r.booked} booked`}>
              <td className="w-[38%] py-1.5 pr-3 align-middle">{r.label}</td>
              <td className="py-1.5 align-middle">
                <div className="grid gap-[2px]">
                  <div className="h-2.5 rounded-r-[3px] bg-series-1" style={{ width: `${(r.enquiries / max) * 100}%` }} />
                  <div className="h-2.5 rounded-r-[3px] bg-series-2" style={{ width: `${(r.booked / max) * 100}%`, minWidth: r.booked ? 3 : 0 }} />
                </div>
              </td>
              <td className="w-10 py-1.5 pl-3 text-right tabular">{r.enquiries}</td>
              <td className="w-10 py-1.5 pl-2 text-right tabular text-ink-2">{r.booked}</td>
              <td className="w-14 py-1.5 pl-2 text-right text-[12px] tabular text-ink-3">{pct(r.booked, r.enquiries).toFixed(0)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function RevenuePanel({
  bookedFees,
  opportunity,
  bookedCount,
  recoveredOpportunity,
  recovered,
  currentRate,
  days,
}: {
  bookedFees: number;
  opportunity: number;
  bookedCount: number;
  recoveredOpportunity: number;
  recovered: number;
  currentRate: number;
  days: number;
}) {
  const data = useClinicData();
  const updateRoi = useDemoStore((s) => s.updateRoi);
  const [baseline, setBaseline] = useState(15);
  const avgValue = bookedCount ? (bookedFees + opportunity) / bookedCount : 0;
  const additional = Math.max(0, currentRate - baseline);
  const acceptance = Math.round(data.roi.treatmentAcceptance * 100);

  return (
    <section className="grid gap-6 rounded-[8px] border border-line bg-surface p-5 lg:grid-cols-[1fr_1fr]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-semibold">Estimated revenue opportunity</h2>
          <span className="rounded-[3px] bg-signal-wash px-1.5 py-0.5 text-[11px] font-semibold">Estimate</span>
        </div>
        <p className="mt-1 text-[13px] text-ink-2">
          From consultations booked in the last {days} days, using configured consultation fees and each service&apos;s estimated case value.
        </p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[12.5px] text-ink-2">Consultation fees booked</dt>
            <dd className="board-type mt-1 text-[28px] font-semibold tabular">{inr(bookedFees)}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-ink-2">Treatment opportunity</dt>
            <dd className="board-type mt-1 text-[28px] font-semibold tabular">{inr(opportunity)}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-ink-2">From reactivation ({recovered} recovered)</dt>
            <dd className="board-type mt-1 text-[22px] font-semibold tabular">{inr(recoveredOpportunity)}</dd>
          </div>
          <label className="grid gap-1 text-[12.5px] text-ink-2">
            Treatment acceptance assumption
            <span className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={acceptance}
                onChange={(e) => updateRoi({ treatmentAcceptance: Math.min(100, Math.max(0, Number(e.target.value))) / 100 })}
                className="h-9 w-20 rounded-[6px] border border-line-strong px-2 text-[14px] text-ink tabular focus:border-ink focus:outline-none"
              />
              %
            </span>
          </label>
        </dl>
      </div>
      <div className="rounded-[8px] bg-board p-5 text-board-ink">
        <h3 className="text-[15px] font-semibold">What this means per 100 enquiries</h3>
        <label className="mt-3 grid gap-1 text-[12.5px] text-board-ink-2">
          Booking rate before ConsultFlow (your estimate)
          <span className="flex items-center gap-3">
            <input type="range" min={0} max={60} value={baseline} onChange={(e) => setBaseline(Number(e.target.value))} className="w-full accent-[var(--signal)]" />
            <span className="w-10 text-right text-[14px] font-semibold text-board-ink tabular">{baseline}%</span>
          </span>
        </label>
        <div className="mt-5 grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-3">
          <span className="board-type text-[30px] font-semibold tabular">100</span>
          <span className="text-[13.5px] text-board-ink-2">enquiries</span>
          <span className="board-type text-[30px] font-semibold tabular text-signal">+{Math.round(additional)}</span>
          <span className="text-[13.5px] text-board-ink-2">
            additional booked consultations ({currentRate.toFixed(1)}% now vs {baseline}% before)
          </span>
          <span className="board-type text-[30px] font-semibold tabular">{inr(additional * avgValue)}</span>
          <span className="text-[13.5px] text-board-ink-2">estimated value, at {inr(avgValue)} per booked consultation</span>
        </div>
        <p className="mt-4 text-[11.5px] leading-relaxed text-board-ink-2">Demo data and your own assumptions. Not a measured result or a guarantee.</p>
      </div>
    </section>
  );
}
