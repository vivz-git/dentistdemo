import type { ClinicData, Lead } from "@/lib/domain/types";
import { dayTime, relativeTime, shortDate } from "./format";

export function serviceName(data: ClinicData, id?: string) {
  return data.services.find((s) => s.id === id)?.name ?? "Not yet known";
}

export function staffName(data: ClinicData, id?: string) {
  return data.staff.find((s) => s.id === id)?.name ?? "Unassigned";
}

/** One-line "what happens next" for a lead, shown on boards and lists. */
export function nextStep(lead: Lead, data: ClinicData, now: Date): string {
  const tz = data.clinic.timezone;
  const appt = data.appointments.find((a) => a.id === lead.appointmentId);
  const nudge = data.followUps
    .filter((f) => f.leadId === lead.id && f.status === "scheduled")
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  switch (lead.status) {
    case "new":
      return lead.source === "phone" ? "Missed call, no reply yet" : "Waiting for first reply";
    case "contacted":
      return nudge ? `Follow-up ${relativeTime(nudge.dueAt, now)}` : "Waiting for patient";
    case "qualified":
      return nudge ? `Times offered · nudge ${relativeTime(nudge.dueAt, now)}` : "Times offered";
    case "booked":
      return appt ? `Consultation ${dayTime(appt.start, tz)}` : "Booked";
    case "attended":
      return appt ? `Attended ${shortDate(appt.start, tz)}` : "Attended";
    case "needs_human":
      return lead.intake.urgency === "urgent" ? "Urgent: front desk to call" : "Front desk to reply";
    case "lost":
      return lead.lostReason ?? "Closed";
    case "do_not_contact":
      return "Opted out, never contact";
  }
}
