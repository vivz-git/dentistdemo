import type { AppointmentStatus, Channel, LeadSource, LeadStatus, RecipientStatus } from "./types";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  booked: "Booked",
  attended: "Attended",
  lost: "Lost",
  needs_human: "Needs Human",
  do_not_contact: "Do Not Contact",
};

/** Tone keys map to the status tokens in globals.css. */
export const STATUS_TONE: Record<LeadStatus, string> = {
  new: "new",
  contacted: "contacted",
  qualified: "qualified",
  booked: "booked",
  attended: "attended",
  lost: "lost",
  needs_human: "human",
  do_not_contact: "dnc",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  website: "Website form",
  whatsapp: "WhatsApp",
  google: "Google Business",
  instagram: "Instagram",
  directory: "Directory listing",
  phone: "Missed call",
  referral: "Referral",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  web_chat: "Web chat",
};

export const APPOINTMENT_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  attended: "Attended",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export const RECIPIENT_LABEL: Record<RecipientStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  replied: "Replied",
  interested: "Interested",
  booked: "Booked",
  unsubscribed: "Opted out",
  needs_human: "Needs Human",
  no_response: "No response",
};

/** Funnel order. "Lost", "Needs Human" and "Do Not Contact" sit outside it. */
export const FUNNEL_STAGES = ["Enquiries", "Contacted", "Qualified", "Consultation Booked", "Consultation Attended"] as const;
