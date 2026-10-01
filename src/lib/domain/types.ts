/**
 * ConsultFlow domain model.
 *
 * Every tenant-owned entity carries `clinicId` so the same shapes map directly
 * onto the multi-tenant Postgres schema in `supabase/migrations`. Timestamps are
 * ISO-8601 strings in UTC; presentation converts to the clinic's timezone.
 */

export type ID = string;
export type ISODate = string;

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "booked",
  "attended",
  "lost",
  "needs_human",
  "do_not_contact",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "website",
  "whatsapp",
  "google",
  "instagram",
  "directory",
  "phone",
  "referral",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export type Channel = "whatsapp" | "sms" | "email" | "web_chat";

export type ConversationMode = "ai" | "human";

export type MessageAuthor = "patient" | "ai" | "staff" | "system";

export type MessageKind =
  | "text"
  | "slot_offer"
  | "booking_confirmation"
  | "internal_note"
  | "escalation"
  | "reminder";

export type AppointmentStatus = "scheduled" | "confirmed" | "attended" | "no_show" | "cancelled";

export type FollowUpKind =
  | "reminder_24h"
  | "reminder_2h"
  | "no_reply_nudge"
  | "post_consult_check"
  | "reactivation";

export type FollowUpStatus = "scheduled" | "sent" | "cancelled" | "skipped";

export type CampaignStatus = "draft" | "active" | "completed";

export type RecipientStatus =
  | "queued"
  | "sent"
  | "replied"
  | "interested"
  | "booked"
  | "unsubscribed"
  | "needs_human"
  | "no_response";

export type UserRole = "owner" | "manager" | "front_desk";

export interface Clinic {
  id: ID;
  name: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  timezone: string;
  currency: "INR";
  locale: string;
  mapsUrl: string;
  parking: string;
  paymentMethods: string[];
  emergencyInstructions: string;
  escalationInstructions: string;
  booking: BookingRules;
}

export interface OpeningHours {
  /** 0 = Sunday ... 6 = Saturday */
  day: number;
  open: boolean;
  start: string; // "09:30"
  end: string; // "19:30"
  breakStart?: string;
  breakEnd?: string;
}

export interface BookingRules {
  consultationMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  hours: OpeningHours[];
  blackoutDates: string[]; // yyyy-MM-dd in clinic timezone
  slotsToOffer: number;
  reminder24h: boolean;
  reminder2h: boolean;
  noReplyNudgeHours: number;
}

export interface Service {
  id: ID;
  clinicId: ID;
  name: string;
  /** Words patients use; drives intent detection. */
  keywords: string[];
  consultationType: string;
  /** Only quoted if the clinic has configured it. Never invented. */
  consultationFee?: number;
  /** Used only for internal revenue *estimates*, never quoted to patients. */
  estimatedCaseValue: number;
  description: string;
  active: boolean;
}

export interface FAQ {
  id: ID;
  clinicId: ID;
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
}

export interface StaffUser {
  id: ID;
  clinicId: ID;
  name: string;
  role: UserRole;
  email: string;
  initials: string;
}

export interface Lead {
  id: ID;
  clinicId: ID;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  channel: Channel;
  serviceId?: ID;
  status: LeadStatus;
  createdAt: ISODate;
  lastActivityAt: ISODate;
  firstResponseSeconds?: number;
  assignedToId?: ID;
  appointmentId?: ID;
  /** Qualification answers captured in conversation. */
  intake: {
    preferredTime?: string;
    isNewPatient?: boolean;
    concernSummary?: string;
    urgency?: "routine" | "soon" | "urgent";
  };
  /** When the lead first reached each funnel stage; drives the funnel. */
  milestones: {
    contactedAt?: ISODate;
    qualifiedAt?: ISODate;
    bookedAt?: ISODate;
    attendedAt?: ISODate;
  };
  consentToContact: boolean;
  lostReason?: string;
  reactivatedFromCampaignId?: ID;
  notes?: string;
  /** Demo-only marker so seeded vs. simulated data stay distinguishable. */
  demo: true;
}

export interface Conversation {
  id: ID;
  clinicId: ID;
  leadId: ID;
  channel: Channel;
  mode: ConversationMode;
  takenOverById?: ID;
  status: "open" | "waiting_patient" | "needs_human" | "closed";
  unread: number;
  updatedAt: ISODate;
}

export interface SlotRef {
  start: ISODate;
  end: ISODate;
  label: string;
}

export interface Message {
  id: ID;
  clinicId: ID;
  conversationId: ID;
  author: MessageAuthor;
  authorId?: ID;
  kind: MessageKind;
  body: string;
  createdAt: ISODate;
  slots?: SlotRef[];
  /** Why the assistant did what it did; shown to staff only. */
  meta?: {
    intent?: string;
    guardrail?: string;
    provider?: string;
    faqId?: ID;
  };
}

export interface Appointment {
  id: ID;
  clinicId: ID;
  leadId: ID;
  serviceId?: ID;
  start: ISODate;
  end: ISODate;
  status: AppointmentStatus;
  consultationType: string;
  bookedBy: "ai" | "staff";
  createdAt: ISODate;
}

export interface FollowUp {
  id: ID;
  clinicId: ID;
  leadId: ID;
  appointmentId?: ID;
  kind: FollowUpKind;
  channel: Channel;
  dueAt: ISODate;
  status: FollowUpStatus;
  body: string;
}

export interface Campaign {
  id: ID;
  clinicId: ID;
  name: string;
  status: CampaignStatus;
  audience: CampaignAudience;
  message: string;
  channel: Channel;
  createdAt: ISODate;
  launchedAt?: ISODate;
}

export interface CampaignAudience {
  minDaysSinceActivity: number;
  maxDaysSinceActivity: number;
  statuses: LeadStatus[];
  serviceIds: ID[];
}

export interface CampaignRecipient {
  id: ID;
  clinicId: ID;
  campaignId: ID;
  leadId: ID;
  status: RecipientStatus;
  sentAt?: ISODate;
  repliedAt?: ISODate;
  reply?: string;
}

export type AnalyticsEventType =
  | "lead_created"
  | "first_response"
  | "status_changed"
  | "appointment_booked"
  | "handoff"
  | "returned_to_ai"
  | "campaign_launched"
  | "opt_out";

export interface AnalyticsEvent {
  id: ID;
  clinicId: ID;
  type: AnalyticsEventType;
  leadId?: ID;
  at: ISODate;
  data?: Record<string, string | number | boolean>;
}

/** Diary time already taken by patients outside ConsultFlow (from the PMS/calendar). */
export interface BusyBlock {
  start: ISODate;
  end: ISODate;
  label: string;
}

export interface RoiAssumptions {
  /** Share of attended consultations that go ahead with treatment. Estimate. */
  treatmentAcceptance: number;
  /** Average first-visit consultation fee used when a service has none configured. */
  defaultConsultationFee: number;
}

export interface ClinicData {
  version: number;
  seededAt: ISODate;
  clinic: Clinic;
  roi: RoiAssumptions;
  busyBlocks: BusyBlock[];
  services: Service[];
  faqs: FAQ[];
  staff: StaffUser[];
  leads: Lead[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  followUps: FollowUp[];
  campaigns: Campaign[];
  recipients: CampaignRecipient[];
  events: AnalyticsEvent[];
}
