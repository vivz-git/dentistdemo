import type { Clinic, FAQ, LeadSource, LeadStatus, Service, SlotRef } from "@/lib/domain/types";
import type { TimePreference } from "@/lib/booking/availability";

export const INTENTS = [
  "greeting",
  "faq",
  "service_interest",
  "time_preference",
  "booking_request",
  "slot_choice",
  "price_question",
  "symptom_mention",
  "clinical_question",
  "emergency",
  "human_request",
  "opt_out",
  "not_interested",
  "other",
] as const;
export type Intent = (typeof INTENTS)[number];

export interface TranscriptLine {
  author: "patient" | "ai" | "staff" | "system";
  body: string;
}

/**
 * Everything the assistant is allowed to know. Anything not in here does not
 * exist as far as the assistant is concerned, which is how we stop it inventing
 * clinic facts, prices or availability.
 */
export interface AssistantContext {
  clinic: Pick<
    Clinic,
    | "name"
    | "address"
    | "city"
    | "phone"
    | "whatsapp"
    | "website"
    | "mapsUrl"
    | "parking"
    | "paymentMethods"
    | "escalationInstructions"
    | "emergencyInstructions"
    | "timezone"
  > & { hoursSummary: string; consultationMinutes: number };
  services: Pick<Service, "id" | "name" | "keywords" | "consultationType" | "consultationFee" | "description">[];
  faqs: Pick<FAQ, "id" | "question" | "answer" | "keywords">[];
  lead: {
    firstName: string;
    source: LeadSource;
    status: LeadStatus;
    serviceId?: string;
    preferredTime?: string;
  };
  transcript: TranscriptLine[];
  /** Open slots from the booking provider; the only times that may be offered. */
  openSlots: SlotRef[];
  /** Slots in the most recent offer, for resolving "the first one", "Tuesday". */
  lastOfferedSlots: SlotRef[];
  slotsToOffer: number;
  /** "new_lead" for the instant first reply, otherwise "reply". */
  trigger: "new_lead" | "reply";
  now: string;
}

export type AssistantAction =
  | { type: "set_service"; serviceId: string }
  | { type: "set_preferred_time"; preference: TimePreference }
  | { type: "offer_slots"; slots: SlotRef[] }
  | { type: "book_slot"; slot: SlotRef }
  | { type: "escalate"; reason: string; urgent: boolean }
  | { type: "mark_contacted" }
  | { type: "mark_qualified" }
  | { type: "mark_not_interested" }
  | { type: "opt_out" };

export interface AssistantReply {
  body: string;
  intent: Intent;
  actions: AssistantAction[];
  provider: string;
  /** Set when a guardrail changed or produced the reply. */
  guardrail?: "inbound_emergency" | "inbound_clinical" | "inbound_opt_out" | "output_rejected";
  faqId?: string;
}

export interface AIProvider {
  readonly name: string;
  respond(ctx: AssistantContext): Promise<AssistantReply>;
}
