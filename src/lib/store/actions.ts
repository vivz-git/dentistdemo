/**
 * Pure state transitions over ClinicData. The zustand store wraps these, and the
 * unit tests exercise them directly. A production build would run the same
 * transitions server-side against Postgres.
 */
import { buildAssistantContext, availabilityInput } from "@/lib/ai/context";
import type { AssistantAction, AssistantReply } from "@/lib/ai/types";
import { isSlotStillOpen } from "@/lib/booking/availability";
import type {
  AnalyticsEventType,
  Appointment,
  Campaign,
  CampaignRecipient,
  ClinicData,
  Conversation,
  Lead,
  LeadStatus,
  Message,
  RecipientStatus,
  SlotRef,
} from "@/lib/domain/types";
import { formatSlotLabel, HOUR } from "@/lib/time";
import { DEMO_CLINIC_ID } from "@/lib/demo/clinic";

let seq = 0;
export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(++seq).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export function convoFor(data: ClinicData, leadId: string): Conversation {
  const c = data.conversations.find((x) => x.leadId === leadId);
  if (!c) throw new Error(`No conversation for ${leadId}`);
  return c;
}

export function leadById(data: ClinicData, leadId: string): Lead {
  const l = data.leads.find((x) => x.id === leadId);
  if (!l) throw new Error(`Unknown lead ${leadId}`);
  return l;
}

function track(data: ClinicData, type: AnalyticsEventType, leadId: string | undefined, now: Date, extra?: Record<string, string | number | boolean>) {
  data.events.push({ id: newId("evt"), clinicId: DEMO_CLINIC_ID, type, leadId, at: now.toISOString(), data: extra });
}

export function addMessage(data: ClinicData, leadId: string, m: Omit<Message, "id" | "clinicId" | "conversationId" | "createdAt"> & { createdAt?: string }, now: Date): Message {
  const convo = convoFor(data, leadId);
  const lead = leadById(data, leadId);
  const msg: Message = { id: newId("msg"), clinicId: DEMO_CLINIC_ID, conversationId: convo.id, createdAt: now.toISOString(), ...m };
  data.messages.push(msg);
  convo.updatedAt = msg.createdAt;
  if (m.kind !== "internal_note") lead.lastActivityAt = msg.createdAt;
  if (m.author === "patient") convo.unread += 1;
  return msg;
}

/** Status moves forward through the funnel; terminal states are explicit. */
export function setStatus(data: ClinicData, lead: Lead, status: LeadStatus, now: Date) {
  if (lead.status === status) return;
  const from = lead.status;
  lead.status = status;
  const ts = now.toISOString();
  if (status !== "new" && status !== "do_not_contact" && !lead.milestones.contactedAt) lead.milestones.contactedAt = ts;
  if ((status === "qualified" || status === "booked" || status === "attended") && !lead.milestones.qualifiedAt) lead.milestones.qualifiedAt = ts;
  if ((status === "booked" || status === "attended") && !lead.milestones.bookedAt) lead.milestones.bookedAt = ts;
  if (status === "attended" && !lead.milestones.attendedAt) lead.milestones.attendedAt = ts;
  track(data, "status_changed", lead.id, now, { from, to: status });
}

// A lost lead that re-engages (e.g. from reactivation) re-enters the funnel.
const RANK: Partial<Record<LeadStatus, number>> = { lost: -1, new: 0, contacted: 1, qualified: 2, booked: 3, attended: 4 };
export function advance(data: ClinicData, lead: Lead, to: LeadStatus, now: Date) {
  const cur = RANK[lead.status];
  const next = RANK[to];
  if (cur === undefined || next === undefined) return; // needs human / dnc are never auto-advanced
  if (next > cur) setStatus(data, lead, to, now);
}

export function createLead(
  data: ClinicData,
  input: { name: string; phone: string; email?: string; source: Lead["source"]; enquiry?: string; serviceId?: string },
  now: Date,
): Lead {
  const id = newId("lead");
  const lead: Lead = {
    id,
    clinicId: DEMO_CLINIC_ID,
    name: input.name,
    phone: input.phone,
    email: input.email,
    source: input.source,
    channel: input.source === "website" ? "web_chat" : "whatsapp",
    serviceId: input.serviceId,
    status: "new",
    createdAt: now.toISOString(),
    lastActivityAt: now.toISOString(),
    intake: {},
    milestones: {},
    consentToContact: true,
    demo: true,
  };
  data.leads.unshift(lead);
  data.conversations.push({
    id: newId("conv"),
    clinicId: DEMO_CLINIC_ID,
    leadId: id,
    channel: lead.channel,
    mode: "ai",
    status: "open",
    unread: 0,
    updatedAt: lead.createdAt,
  });
  if (input.enquiry) addMessage(data, id, { author: "patient", kind: "text", body: input.enquiry }, now);
  track(data, "lead_created", id, now, { source: input.source });
  return lead;
}

export type BookingOutcome = { ok: true; appointment: Appointment } | { ok: false; message: string };

export function bookSlot(data: ClinicData, leadId: string, slot: SlotRef, by: "ai" | "staff", now: Date, staffId?: string): BookingOutcome {
  const lead = leadById(data, leadId);
  if (!isSlotStillOpen(slot, availabilityInput(data, now))) {
    return { ok: false, message: "That time is no longer available." };
  }
  // Rebooking replaces the earlier appointment.
  const existing = data.appointments.find((a) => a.id === lead.appointmentId && a.status !== "cancelled");
  if (existing) existing.status = "cancelled";
  data.followUps.forEach((f) => {
    if (f.leadId === leadId && f.status === "scheduled" && (f.kind === "no_reply_nudge" || f.appointmentId === existing?.id)) f.status = "cancelled";
  });

  const svc = data.services.find((s) => s.id === lead.serviceId);
  const appt: Appointment = {
    id: newId("apt"),
    clinicId: DEMO_CLINIC_ID,
    leadId,
    serviceId: lead.serviceId,
    start: slot.start,
    end: slot.end,
    status: "scheduled",
    consultationType: svc?.consultationType ?? "Dental consultation",
    bookedBy: by,
    createdAt: now.toISOString(),
  };
  data.appointments.push(appt);
  lead.appointmentId = appt.id;
  setStatus(data, lead, "booked", now);

  const first = lead.name.split(" ")[0];
  const tz = data.clinic.timezone;
  const start = new Date(slot.start).getTime();
  const rules = data.clinic.booking;
  const scheduled: string[] = [];
  const channel = lead.channel === "web_chat" ? "whatsapp" : lead.channel;
  if (rules.reminder24h && start - 24 * HOUR > now.getTime()) {
    data.followUps.push({ id: newId("fu"), clinicId: DEMO_CLINIC_ID, leadId, appointmentId: appt.id, kind: "reminder_24h", channel, dueAt: new Date(start - 24 * HOUR).toISOString(), status: "scheduled", body: `Hi ${first}, a reminder of your ${appt.consultationType.toLowerCase()} at ${data.clinic.name} tomorrow, ${slot.label}. Reply C to confirm or R to reschedule.` });
    scheduled.push("24 hours");
  }
  if (rules.reminder2h && start - 2 * HOUR > now.getTime()) {
    data.followUps.push({ id: newId("fu"), clinicId: DEMO_CLINIC_ID, leadId, appointmentId: appt.id, kind: "reminder_2h", channel, dueAt: new Date(start - 2 * HOUR).toISOString(), status: "scheduled", body: `Hi ${first}, see you at ${formatSlotLabel(new Date(start), tz).split(", ").pop()} today. ${data.clinic.parking}` });
    scheduled.push("2 hours");
  }

  const place = `${data.clinic.name}, ${data.clinic.address}`;
  addMessage(
    data,
    leadId,
    {
      author: by === "ai" ? "ai" : "staff",
      authorId: staffId,
      kind: "booking_confirmation",
      body: `You're booked for your ${appt.consultationType.toLowerCase()} on ${slot.label} at ${place}. ${scheduled.length ? "We'll send a reminder before your visit. " : ""}Reply here if you need to change the time.`,
    },
    now,
  );
  addMessage(
    data,
    leadId,
    { author: "system", kind: "text", body: `Appointment created${by === "staff" ? " by staff" : ""}.${scheduled.length ? ` Reminders scheduled for ${scheduled.join(" and ")} before.` : ""}` },
    new Date(now.getTime() + 1),
  );
  track(data, "appointment_booked", leadId, now, { by });
  return { ok: true, appointment: appt };
}

export function escalate(data: ClinicData, leadId: string, reason: string, urgent: boolean, now: Date) {
  const lead = leadById(data, leadId);
  const convo = convoFor(data, leadId);
  convo.mode = "human";
  convo.status = "needs_human";
  if (lead.status !== "booked" && lead.status !== "attended") setStatus(data, lead, "needs_human", now);
  if (urgent) lead.intake.urgency = "urgent";
  addMessage(data, leadId, { author: "system", kind: "text", body: `Escalated to the front desk: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}. Assistant paused.` }, new Date(now.getTime() + 1));
  track(data, "handoff", leadId, now, { reason, urgent });
}

export function optOut(data: ClinicData, leadId: string, now: Date) {
  const lead = leadById(data, leadId);
  lead.consentToContact = false;
  setStatus(data, lead, "do_not_contact", now);
  const convo = convoFor(data, leadId);
  convo.status = "closed";
  data.followUps.forEach((f) => {
    if (f.leadId === leadId && f.status === "scheduled" && f.kind !== "reminder_24h" && f.kind !== "reminder_2h") f.status = "cancelled";
  });
  data.recipients.forEach((r) => {
    if (r.leadId === leadId && r.status !== "booked") r.status = "unsubscribed";
  });
  track(data, "opt_out", leadId, now);
}

/** Apply an assistant turn: write its message, then carry out its actions. */
export function applyAssistantReply(data: ClinicData, leadId: string, reply: AssistantReply, now: Date): { booked?: Appointment; bookingError?: string } {
  const lead = leadById(data, leadId);
  const convo = convoFor(data, leadId);
  const offer = reply.actions.find((a): a is Extract<AssistantAction, { type: "offer_slots" }> => a.type === "offer_slots");
  const escalation = reply.actions.find((a): a is Extract<AssistantAction, { type: "escalate" }> => a.type === "escalate");
  const bookAction = reply.actions.find((a): a is Extract<AssistantAction, { type: "book_slot" }> => a.type === "book_slot");

  if (reply.body) {
    addMessage(
      data,
      leadId,
      {
        author: "ai",
        kind: reply.guardrail === "inbound_emergency" || reply.guardrail === "inbound_clinical" ? "escalation" : offer ? "slot_offer" : "text",
        body: reply.body,
        slots: offer?.slots,
        meta: { intent: reply.intent, guardrail: reply.guardrail, provider: reply.provider, faqId: reply.faqId },
      },
      now,
    );
  }
  if (!lead.firstResponseSeconds && reply.body) {
    lead.firstResponseSeconds = Math.max(1, Math.round((now.getTime() - new Date(lead.createdAt).getTime()) / 1000));
    track(data, "first_response", leadId, now, { seconds: lead.firstResponseSeconds });
  }

  const result: { booked?: Appointment; bookingError?: string } = {};
  for (const a of reply.actions) {
    switch (a.type) {
      case "set_service":
        lead.serviceId = a.serviceId;
        break;
      case "set_preferred_time":
        lead.intake.preferredTime = a.preference;
        break;
      case "mark_contacted":
        advance(data, lead, "contacted", now);
        break;
      case "mark_qualified":
        advance(data, lead, "contacted", now);
        advance(data, lead, "qualified", now);
        break;
      case "mark_not_interested":
        setStatus(data, lead, "lost", now);
        lead.lostReason = "Not interested";
        convo.status = "closed";
        break;
      case "opt_out":
        optOut(data, leadId, now);
        break;
      default:
        break;
    }
  }
  if (bookAction) {
    const r = bookSlot(data, leadId, bookAction.slot, "ai", new Date(now.getTime() + 2));
    if (r.ok) result.booked = r.appointment;
    else {
      result.bookingError = r.message;
      addMessage(data, leadId, { author: "ai", kind: "text", body: "Sorry, that time was just taken. Here are the times still open:" }, now);
    }
  }
  if (escalation) escalate(data, leadId, escalation.reason, escalation.urgent, now);
  if (!escalation && !bookAction && convo.status !== "closed") convo.status = "waiting_patient";

  // No-reply nudge after an unanswered offer or greeting.
  if ((offer || reply.intent === "greeting") && lead.consentToContact) {
    data.followUps.forEach((f) => {
      if (f.leadId === leadId && f.kind === "no_reply_nudge" && f.status === "scheduled") f.status = "cancelled";
    });
    data.followUps.push({
      id: newId("fu"),
      clinicId: DEMO_CLINIC_ID,
      leadId,
      kind: "no_reply_nudge",
      channel: lead.channel === "web_chat" ? "whatsapp" : lead.channel,
      dueAt: new Date(now.getTime() + data.clinic.booking.noReplyNudgeHours * HOUR).toISOString(),
      status: "scheduled",
      body: `Hi ${lead.name.split(" ")[0]}, just checking in. Would you like me to find you a consultation time?`,
    });
  }
  return result;
}

export function takeOver(data: ClinicData, leadId: string, staffId: string, staffName: string, now: Date) {
  const convo = convoFor(data, leadId);
  convo.mode = "human";
  convo.takenOverById = staffId;
  convo.unread = 0;
  leadById(data, leadId).assignedToId = staffId;
  addMessage(data, leadId, { author: "system", kind: "text", body: `${staffName} took over the conversation. The assistant is paused.` }, now);
  track(data, "handoff", leadId, now, { reason: "manual takeover", urgent: false });
}

export function returnToAI(data: ClinicData, leadId: string, staffName: string, now: Date) {
  const convo = convoFor(data, leadId);
  const lead = leadById(data, leadId);
  convo.mode = "ai";
  convo.takenOverById = undefined;
  convo.status = "open";
  if (lead.status === "needs_human") {
    setStatus(data, lead, lead.milestones.qualifiedAt ? "qualified" : "contacted", now);
  }
  addMessage(data, leadId, { author: "system", kind: "text", body: `${staffName} returned the conversation to the assistant.` }, now);
  track(data, "returned_to_ai", leadId, now);
}

export function assistantContextFor(data: ClinicData, leadId: string, trigger: "new_lead" | "reply", now: Date) {
  return buildAssistantContext(data, leadId, trigger, now);
}

// ---------- Reactivation ----------

export function eligibleForCampaign(data: ClinicData, audience: Campaign["audience"], now: Date): Lead[] {
  const inActive = new Set(data.recipients.filter((r) => data.campaigns.find((c) => c.id === r.campaignId)?.status === "active").map((r) => r.leadId));
  const contacted = new Set(data.recipients.map((r) => r.leadId));
  return data.leads.filter((l) => {
    if (!l.consentToContact || l.status === "do_not_contact") return false;
    if (!audience.statuses.includes(l.status)) return false;
    if (audience.serviceIds.length && (!l.serviceId || !audience.serviceIds.includes(l.serviceId))) return false;
    const days = (now.getTime() - new Date(l.lastActivityAt).getTime()) / (24 * HOUR);
    if (days < audience.minDaysSinceActivity || days > audience.maxDaysSinceActivity) return false;
    return !inActive.has(l.id) && !contacted.has(l.id);
  });
}

export function renderCampaignMessage(template: string, data: ClinicData, lead: Lead): string {
  const svc = data.services.find((s) => s.id === lead.serviceId);
  return template
    .replaceAll("{first_name}", lead.name.split(" ")[0])
    .replaceAll("{service}", svc ? svc.name.toLowerCase() : "a dental consultation")
    .replaceAll("{clinic_name}", data.clinic.name);
}

export function launchCampaign(data: ClinicData, campaignId: string, now: Date): CampaignRecipient[] {
  const c = data.campaigns.find((x) => x.id === campaignId);
  if (!c || c.status !== "draft") return [];
  const audience = eligibleForCampaign(data, c.audience, now);
  c.status = "active";
  c.launchedAt = now.toISOString();
  const recs = audience.map((lead, i) => {
    const sentAt = new Date(now.getTime() + i);
    addMessage(data, lead.id, { author: "ai", kind: "reminder", body: renderCampaignMessage(c.message, data, lead), meta: { intent: "reactivation", provider: "campaign" } }, sentAt);
    data.followUps.push({ id: newId("fu"), clinicId: DEMO_CLINIC_ID, leadId: lead.id, kind: "reactivation", channel: "whatsapp", dueAt: sentAt.toISOString(), status: "sent", body: "Reactivation message" });
    const r: CampaignRecipient = { id: newId("rcp"), clinicId: DEMO_CLINIC_ID, campaignId, leadId: lead.id, status: "sent", sentAt: sentAt.toISOString() };
    data.recipients.push(r);
    return r;
  });
  track(data, "campaign_launched", undefined, now, { campaignId, recipients: recs.length });
  return recs;
}

/** Scripted, deterministic reply outcomes for the simulated campaign. */
export const SIMULATED_REPLIES: { status: RecipientStatus; reply?: string }[] = [
  { status: "interested", reply: "Yes, I'm still interested." },
  { status: "no_response" },
  { status: "booked", reply: "Yes please. Saturday works." },
  { status: "no_response" },
  { status: "replied", reply: "Thanks, I got it done elsewhere." },
  { status: "no_response" },
  { status: "unsubscribed", reply: "STOP" },
  { status: "interested", reply: "Maybe. What are the timings?" },
  { status: "no_response" },
  { status: "needs_human", reply: "Is it normal that my old filling hurts when I drink cold water?" },
  { status: "booked", reply: "Yes, a weekday evening would be good." },
  { status: "no_response" },
];
