import type { ClinicData, Lead, LeadSource } from "@/lib/domain/types";
import { dateKey, DAY, MINUTE } from "@/lib/time";

export interface FunnelCounts {
  enquiries: number;
  contacted: number;
  qualified: number;
  booked: number;
  attended: number;
}

export function funnel(leads: Lead[]): FunnelCounts {
  return {
    enquiries: leads.length,
    contacted: leads.filter((l) => l.milestones.contactedAt).length,
    qualified: leads.filter((l) => l.milestones.qualifiedAt || l.milestones.bookedAt).length,
    booked: leads.filter((l) => l.milestones.bookedAt).length,
    attended: leads.filter((l) => l.milestones.attendedAt).length,
  };
}

export const pct = (n: number, d: number) => (d === 0 ? 0 : (n / d) * 100);

export function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function leadsInWindow(data: ClinicData, now: Date, days: number): Lead[] {
  const from = now.getTime() - days * DAY;
  return data.leads.filter((l) => new Date(l.createdAt).getTime() >= from);
}

export function isToday(iso: string, now: Date, tz: string) {
  return dateKey(new Date(iso), tz) === dateKey(now, tz);
}

export interface DashboardKpis {
  enquiriesToday: number;
  enquiriesYesterday: number;
  responseRate: number;
  medianResponseSeconds?: number;
  booked: number;
  bookingRate: number;
  pendingFollowUps: number;
  reactivatedLeads: number;
  recoveredConsultations: number;
  missed: { unanswered: number; needsHuman: number; lost: number; total: number };
  upcomingConsultations: number;
}

export function dashboardKpis(data: ClinicData, now: Date, windowDays = 30): DashboardKpis {
  const tz = data.clinic.timezone;
  const recent = leadsInWindow(data, now, windowDays);
  const f = funnel(recent);
  const yesterday = new Date(now.getTime() - DAY);
  const unanswered = data.leads.filter((l) => l.status === "new" && now.getTime() - new Date(l.createdAt).getTime() > 10 * MINUTE).length;
  const needsHuman = data.leads.filter((l) => l.status === "needs_human").length;
  const lost = recent.filter((l) => l.status === "lost").length;
  const reactivated = data.leads.filter((l) => l.reactivatedFromCampaignId);
  return {
    enquiriesToday: data.leads.filter((l) => isToday(l.createdAt, now, tz)).length,
    enquiriesYesterday: data.leads.filter((l) => dateKey(new Date(l.createdAt), tz) === dateKey(yesterday, tz)).length,
    responseRate: pct(f.contacted, f.enquiries),
    medianResponseSeconds: median(recent.map((l) => l.firstResponseSeconds).filter((x): x is number => typeof x === "number")),
    booked: f.booked,
    bookingRate: pct(f.booked, f.enquiries),
    pendingFollowUps: data.followUps.filter((x) => x.status === "scheduled").length,
    reactivatedLeads: reactivated.length,
    recoveredConsultations: reactivated.filter((l) => l.milestones.bookedAt).length,
    missed: { unanswered, needsHuman, lost, total: unanswered + needsHuman + lost },
    upcomingConsultations: data.appointments.filter((a) => new Date(a.start).getTime() > now.getTime() && a.status !== "cancelled").length,
  };
}

export interface DailyPoint {
  key: string;
  label: string;
  enquiries: number;
  booked: number;
}

export function dailySeries(data: ClinicData, now: Date, days = 30): DailyPoint[] {
  const tz = data.clinic.timezone;
  const points: DailyPoint[] = [];
  const index = new Map<string, DailyPoint>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    const key = dateKey(d, tz);
    const p = { key, label: new Intl.DateTimeFormat("en-IN", { timeZone: tz, day: "numeric", month: "short" }).format(d), enquiries: 0, booked: 0 };
    points.push(p);
    index.set(key, p);
  }
  for (const l of data.leads) {
    const p = index.get(dateKey(new Date(l.createdAt), tz));
    if (p) p.enquiries++;
    if (l.milestones.bookedAt) {
      const b = index.get(dateKey(new Date(l.milestones.bookedAt), tz));
      if (b) b.booked++;
    }
  }
  return points;
}

export interface Breakdown {
  key: string;
  enquiries: number;
  booked: number;
}

export function bySource(leads: Lead[]): (Breakdown & { key: LeadSource })[] {
  const map = new Map<LeadSource, Breakdown & { key: LeadSource }>();
  for (const l of leads) {
    const row = map.get(l.source) ?? { key: l.source, enquiries: 0, booked: 0 };
    row.enquiries++;
    if (l.milestones.bookedAt) row.booked++;
    map.set(l.source, row);
  }
  return [...map.values()].sort((a, b) => b.enquiries - a.enquiries);
}

export function byService(leads: Lead[]): Breakdown[] {
  const map = new Map<string, Breakdown>();
  for (const l of leads) {
    const key = l.serviceId ?? "unknown";
    const row = map.get(key) ?? { key, enquiries: 0, booked: 0 };
    row.enquiries++;
    if (l.milestones.bookedAt) row.booked++;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.enquiries - a.enquiries);
}

export interface RevenueEstimate {
  consultationFees: number;
  treatmentOpportunity: number;
  bookedCount: number;
}

/**
 * Estimates only. Consultation fees come from configured services; treatment
 * opportunity = sum of each booked lead's service case value x acceptance rate.
 */
export function revenueEstimate(data: ClinicData, leads: Lead[]): RevenueEstimate {
  let fees = 0;
  let opportunity = 0;
  let bookedCount = 0;
  for (const l of leads) {
    if (!l.milestones.bookedAt) continue;
    bookedCount++;
    const s = data.services.find((x) => x.id === l.serviceId);
    fees += s?.consultationFee ?? data.roi.defaultConsultationFee;
    opportunity += (s?.estimatedCaseValue ?? 0) * data.roi.treatmentAcceptance;
  }
  return { consultationFees: fees, treatmentOpportunity: Math.round(opportunity), bookedCount };
}

/** Simple what-if model for the ROI panel. All inputs are user-supplied estimates. */
export function roiModel(input: { monthlyEnquiries: number; currentBookingRate: number; improvedBookingRate: number; avgValue: number }) {
  const current = (input.monthlyEnquiries * input.currentBookingRate) / 100;
  const improved = (input.monthlyEnquiries * input.improvedBookingRate) / 100;
  const additional = Math.max(0, improved - current);
  return { current, improved, additional, value: additional * input.avgValue };
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
