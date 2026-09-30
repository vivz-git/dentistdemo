import { pickSlotsToOffer, type TimePreference } from "@/lib/booking/availability";
import {
  AFFIRMATIVE,
  BOOKING_INTENT,
  detectService,
  detectTimePreference,
  GREETING,
  matchFaq,
  matchSlotChoice,
  NOT_INTERESTED,
  PRICE_INTENT,
} from "../knowledge";
import { classifyInbound } from "../guardrails";
import type { AIProvider, AssistantAction, AssistantContext, AssistantReply, Intent } from "../types";

const TIME_QUESTION = "What time of day usually works for you: mornings, afternoons, evenings or weekends?";

/**
 * Deterministic assistant used in demo mode and as the fallback whenever a
 * generative provider is unavailable or its output fails a guardrail.
 * It can only say things that come from the context it was given.
 */
export class DemoAssistant implements AIProvider {
  readonly name = "demo-rules";

  async respond(ctx: AssistantContext): Promise<AssistantReply> {
    return respondDeterministically(ctx);
  }
}

function serviceName(ctx: AssistantContext, id?: string) {
  return ctx.services.find((s) => s.id === id);
}

function offer(ctx: AssistantContext, pref: TimePreference, lead: string, intent: Intent, extra: AssistantAction[] = []): AssistantReply {
  const slots = pickSlotsToOffer(ctx.openSlots, ctx.slotsToOffer, pref, ctx.clinic.timezone);
  if (slots.length === 0) {
    return {
      body: `${lead}I can't see an open consultation time in the next few weeks, so I've asked the front desk to find one for you. They'll message you here shortly.`.trim(),
      intent,
      actions: [...extra, { type: "escalate", reason: "No open slots available to offer", urgent: false }],
      provider: "demo-rules",
    };
  }
  const list = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");
  return {
    body: `${lead}These are the next open consultation times (${ctx.clinic.consultationMinutes} minutes):\n${list}\nTap a time or reply with the option number and I'll reserve it.`.trim(),
    intent,
    actions: [...extra, { type: "mark_qualified" }, { type: "offer_slots", slots }],
    provider: "demo-rules",
  };
}

export function respondDeterministically(ctx: AssistantContext): AssistantReply {
  const first = ctx.lead.firstName;
  const svc = serviceName(ctx, ctx.lead.serviceId);
  const lastPatient = [...ctx.transcript].reverse().find((l) => l.author === "patient");
  const text = lastPatient?.body ?? "";

  // Instant first response to a new enquiry.
  if (ctx.trigger === "new_lead") {
    const detected = svc ?? detectService(text, ctx.services);
    const actions: AssistantAction[] = [{ type: "mark_contacted" }];
    if (detected && !svc) actions.push({ type: "set_service", serviceId: detected.id });
    const about = detected ? ` about ${detected.name.toLowerCase()}` : "";
    const next = detected
      ? `The first step is a ${detected.consultationType.toLowerCase()}, where the dentist examines and explains your options in person. ${TIME_QUESTION}`
      : "Which treatment would you like to discuss? For example implants, aligners, braces, root canal treatment, whitening or a general check-up.";
    const opener =
      ctx.lead.source === "phone"
        ? `Hi ${first}, sorry we missed your call to ${ctx.clinic.name}.`
        : `Hi ${first}, thanks for your enquiry${about} at ${ctx.clinic.name}.`;
    return {
      body: `${opener} I'm the clinic's automated booking assistant and I can help you book a consultation or answer questions about timings, location and payments. ${next}`,
      intent: "greeting",
      actions,
      provider: "demo-rules",
    };
  }

  const risk = classifyInbound(text);

  if (risk === "human_request") {
    return {
      body: `Of course. I've asked the front desk team to take over this conversation. ${ctx.clinic.escalationInstructions}`,
      intent: "human_request",
      actions: [{ type: "escalate", reason: "Patient asked to speak to a person", urgent: false }],
      provider: "demo-rules",
    };
  }

  // Patient picked one of the offered times in words.
  const chosen = matchSlotChoice(text, ctx.lastOfferedSlots, ctx.clinic.timezone);
  if (chosen && ctx.openSlots.some((s) => s.start === chosen.start)) {
    return { body: "", intent: "slot_choice", actions: [{ type: "book_slot", slot: chosen }], provider: "demo-rules" };
  }

  if (NOT_INTERESTED.test(text)) {
    return {
      body: `No problem, ${first}. Thanks for letting us know. If you'd like to book in future, just message us here.`,
      intent: "not_interested",
      actions: [{ type: "mark_not_interested" }],
      provider: "demo-rules",
    };
  }

  const detected = detectService(text, ctx.services);
  const actions: AssistantAction[] = [];
  const effectiveService = svc ?? detected;
  if (detected && detected.id !== svc?.id) actions.push({ type: "set_service", serviceId: detected.id });

  const pref = detectTimePreference(text) ?? (ctx.lead.preferredTime as TimePreference | undefined);
  if (detectTimePreference(text)) actions.push({ type: "set_preferred_time", preference: detectTimePreference(text)! });

  // Symptom mentioned without asking for advice: acknowledge, never advise, keep booking.
  if (risk === "symptom_mention") {
    const lead = `I'm sorry you're dealing with that. I can't advise on symptoms, but I can get you seen by a dentist. If it becomes severe or you notice swelling, please call ${ctx.clinic.phone}.\n\n`;
    return offer(ctx, pref ?? "any", lead, "symptom_mention", actions);
  }

  if (PRICE_INTENT.test(text)) {
    const s = effectiveService;
    let body: string;
    if (s?.consultationFee) {
      body = `The ${s.consultationType.toLowerCase()} is ₹${s.consultationFee.toLocaleString("en-IN")}. Treatment costs depend on what the dentist finds during the consultation, so I can't quote them here. The team will explain costs and payment options before anything is started.`;
    } else if (s) {
      body = `I don't have a confirmed price for ${s.name.toLowerCase()} to share. Costs depend on the dentist's assessment, and the team will go through them with you at the consultation.`;
    } else {
      body = "Treatment costs depend on the dentist's assessment, so I can't quote a price here. The team explains all costs at the consultation before anything is started.";
    }
    const faq = matchFaq(text, ctx.faqs);
    const payment = faq && /pay|emi|card|upi|insurance/i.test(faq.question) ? ` ${faq.answer}` : "";
    const next = pref ? "" : `\n\n${s ? TIME_QUESTION : "Which treatment are you interested in?"}`;
    if (pref && s) return offer(ctx, pref, `${body}${payment}\n\n`, "price_question", actions);
    return { body: `${body}${payment}${next}`, intent: "price_question", actions, provider: "demo-rules" };
  }

  const faq = matchFaq(text, ctx.faqs);
  if (faq) {
    const follow = !effectiveService
      ? "\n\nWhich treatment would you like to discuss?"
      : !pref
        ? `\n\nWould you like me to find you a consultation time? ${TIME_QUESTION}`
        : "\n\nWould you like me to show you the next open consultation times?";
    return { body: `${faq.answer}${follow}`, intent: "faq", actions, provider: "demo-rules", faqId: faq.id };
  }

  if (pref && effectiveService) {
    return offer(ctx, pref, "", "time_preference", actions);
  }

  if (BOOKING_INTENT.test(text) || AFFIRMATIVE.test(text)) {
    if (!effectiveService) {
      return {
        body: "Happy to help you book. Which treatment would you like to discuss? For example implants, aligners, braces, root canal treatment, whitening or a general check-up.",
        intent: "booking_request",
        actions,
        provider: "demo-rules",
      };
    }
    return offer(ctx, pref ?? "any", "", "booking_request", actions);
  }

  if (detected) {
    return {
      body: `Thanks. The first step for ${detected.name.toLowerCase()} is a ${detected.consultationType.toLowerCase()}. ${TIME_QUESTION}`,
      intent: "service_interest",
      actions,
      provider: "demo-rules",
    };
  }

  if (GREETING.test(text)) {
    return {
      body: `Hello ${first}. ${effectiveService ? TIME_QUESTION : "Which treatment would you like to discuss?"}`,
      intent: "greeting",
      actions,
      provider: "demo-rules",
    };
  }

  // Anything else: don't guess. Offer what we can do and a route to a person.
  return {
    body: `I'm not able to answer that one, but I've noted it for the team. I can help with booking a consultation, clinic timings, location, parking and payment options. ${effectiveService ? TIME_QUESTION : "Which treatment would you like to discuss?"}`,
    intent: "other",
    actions,
    provider: "demo-rules",
  };
}
