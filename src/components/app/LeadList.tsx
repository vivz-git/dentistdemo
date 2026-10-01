"use client";

import clsx from "clsx";
import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { StatusChip } from "@/components/ui/StatusChip";
import { LEAD_SOURCES, LEAD_STATUSES, type Lead } from "@/lib/domain/types";
import { APPOINTMENT_LABEL, SOURCE_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useInboxFilters } from "@/lib/store/useInboxFilters";
import { dayTime, relativeTime, shortDate } from "@/lib/ui/format";
import { serviceName, staffName } from "@/lib/ui/leadInfo";

export function useFilteredLeads(): Lead[] {
  const data = useClinicData();
  const f = useInboxFilters();
  const q = f.query.trim().toLowerCase();
  return data.leads
    .filter((l) => {
      if (f.status === "attention" && l.status !== "needs_human" && l.status !== "new") return false;
      if (f.status !== "all" && f.status !== "attention" && l.status !== f.status) return false;
      if (f.source !== "all" && l.source !== f.source) return false;
      if (f.service !== "all" && (l.serviceId ?? "none") !== f.service) return false;
      if (q && !`${l.name} ${l.phone} ${l.email ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}

export function InboxFilters({ compact }: { compact?: boolean }) {
  const data = useClinicData();
  const f = useInboxFilters();
  const count = (s: string) => (s === "all" ? data.leads.length : s === "attention" ? data.leads.filter((l) => l.status === "needs_human" || l.status === "new").length : data.leads.filter((l) => l.status === s).length);
  const select = "h-9 rounded-[6px] border border-line-strong bg-surface px-2.5 text-[13.5px] text-ink focus:border-ink focus:outline-none";
  const tabs = ["all", "attention", ...LEAD_STATUSES] as const;

  return (
    <div className="grid gap-3">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
        {tabs.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={f.status === s}
            onClick={() => f.set({ status: s })}
            className={clsx(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] transition-colors",
              f.status === s ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
            )}
          >
            {s === "all" ? "All" : s === "attention" ? "Needs attention" : STATUS_LABEL[s]}
            <span className={clsx("tabular text-[11.5px]", f.status === s ? "text-white/70" : "text-ink-3")}>{count(s)}</span>
          </button>
        ))}
      </div>
      <div className={clsx("grid gap-2", compact ? "grid-cols-2" : "sm:grid-cols-[1fr_auto_auto]")}>
        <label className={clsx("relative", compact && "col-span-2")}>
          <span className="sr-only">Search leads</span>
          <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <input value={f.query} onChange={(e) => f.set({ query: e.target.value })} placeholder="Search name, phone or email" className={clsx(select, "w-full pl-8")} />
        </label>
        <label>
          <span className="sr-only">Source</span>
          <select value={f.source} onChange={(e) => f.set({ source: e.target.value as typeof f.source })} className={clsx(select, "w-full")}>
            <option value="all">All sources</option>
            {LEAD_SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Service</span>
          <select value={f.service} onChange={(e) => f.set({ service: e.target.value })} className={clsx(select, "w-full")}>
            <option value="all">All services</option>
            {data.services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="none">Not yet known</option>
          </select>
        </label>
      </div>
    </div>
  );
}

/** Compact list used beside an open conversation. */
export function LeadListCompact({ activeId }: { activeId?: string }) {
  const data = useClinicData();
  const now = useNow();
  const leads = useFilteredLeads();
  return (
    <ul className="divide-y divide-line">
      {leads.map((l) => {
        const convo = data.conversations.find((c) => c.leadId === l.id);
        return (
          <li key={l.id}>
            <Link
              href={`/app/inbox/${l.id}`}
              aria-current={l.id === activeId ? "page" : undefined}
              className={clsx("block px-4 py-3 hover:bg-surface-2", l.id === activeId && "bg-surface-2 shadow-[inset_3px_0_0_var(--signal)]")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={clsx("truncate text-[14px]", convo?.unread ? "font-semibold" : "font-medium")}>{l.name}</span>
                <span className="shrink-0 text-[11.5px] text-ink-3 tabular">{relativeTime(l.lastActivityAt, now)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12.5px] text-ink-2">{serviceName(data, l.serviceId)}</span>
                <StatusChip status={l.status} />
              </div>
            </Link>
          </li>
        );
      })}
      {leads.length === 0 && <li className="px-4 py-8 text-[13.5px] text-ink-2">No leads match these filters.</li>}
    </ul>
  );
}

/** Full table for the inbox page. */
export function LeadTable() {
  const data = useClinicData();
  const now = useNow();
  const leads = useFilteredLeads();
  const reset = useInboxFilters((s) => s.reset);
  const tz = data.clinic.timezone;

  if (leads.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="text-[15px] font-medium">No leads match these filters.</p>
        <button onClick={reset} className="mt-2 text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink">
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-line bg-surface">
      <table className="w-full text-left text-[13.5px] max-lg:hidden">
        <thead className="border-b border-line bg-surface-2 text-[12px] font-medium text-ink-2">
          <tr>
            <th className="px-4 py-2.5 font-medium">Lead</th>
            <th className="px-3 py-2.5 font-medium">Source</th>
            <th className="px-3 py-2.5 font-medium">Service interest</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Last activity</th>
            <th className="px-3 py-2.5 font-medium">Assigned</th>
            <th className="px-4 py-2.5 font-medium">Appointment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {leads.map((l) => {
            const appt = data.appointments.find((a) => a.id === l.appointmentId);
            const convo = data.conversations.find((c) => c.leadId === l.id);
            return (
              <tr key={l.id} className="group cursor-pointer hover:bg-surface-2">
                <td className="px-4 py-2.5">
                  <Link href={`/app/inbox/${l.id}`} className="block after:absolute" prefetch={false}>
                    <span className={clsx("block", convo?.unread ? "font-semibold" : "font-medium")}>
                      {l.name}
                      {convo?.unread ? <span className="ml-2 inline-grid h-4 min-w-4 place-items-center rounded-[3px] bg-ink px-1 text-[10.5px] font-semibold text-white">{convo.unread}</span> : null}
                    </span>
                    <span className="block text-[12px] text-ink-3 tabular">
                      {l.phone}
                      {l.email ? ` · ${l.email}` : ""}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink-2">{SOURCE_LABEL[l.source]}</td>
                <td className="px-3 py-2.5">{serviceName(data, l.serviceId)}</td>
                <td className="px-3 py-2.5">
                  <StatusChip status={l.status} />
                </td>
                <td className="px-3 py-2.5 text-ink-2 tabular">{shortDate(l.createdAt, tz)}</td>
                <td className="px-3 py-2.5 text-ink-2 tabular">{relativeTime(l.lastActivityAt, now)}</td>
                <td className="px-3 py-2.5 text-ink-2">{l.assignedToId ? staffName(data, l.assignedToId).replace("Dr. ", "Dr ") : "Assistant"}</td>
                <td className="px-4 py-2.5 text-ink-2">{appt ? <span className="tabular">{APPOINTMENT_LABEL[appt.status]} · {dayTime(appt.start, tz)}</span> : "None"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-line lg:hidden">
        {leads.map((l) => {
          const appt = data.appointments.find((a) => a.id === l.appointmentId);
          return (
            <li key={l.id}>
              <Link href={`/app/inbox/${l.id}`} className="block px-4 py-3 hover:bg-surface-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[14.5px] font-medium">{l.name}</span>
                  <StatusChip status={l.status} />
                </div>
                <div className="mt-1 text-[12.5px] text-ink-2">
                  {serviceName(data, l.serviceId)} · {SOURCE_LABEL[l.source]} · {relativeTime(l.lastActivityAt, now)}
                </div>
                {appt && <div className="mt-1 text-[12.5px] text-ink-2 tabular">Consultation {dayTime(appt.start, tz)}</div>}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
