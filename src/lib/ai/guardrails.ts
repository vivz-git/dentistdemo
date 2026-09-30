import type { AssistantContext, AssistantReply } from "./types";

/** The exact wording the clinic approved for clinical or urgent messages. */
export const CLINICAL_ESCALATION_MESSAGE =
  "I can help with booking and general clinic information, but a dental professional should advise you about your symptoms. Please contact the clinic directly for urgent assistance.";

export type InboundRisk = "emergency" | "clinical_question" | "symptom_mention" | "opt_out" | "human_request" | null;

const EMERGENCY = [
  /\b(swell(ing|ed)?|swollen)\b[^.?!]*\b(face|eye|cheek|neck|jaw|throat)\b/,
  /\b(face|cheek|jaw|neck)\b[^.?!]*\b(swell(ing|ed)?|swollen)\b/,
  /can'?t (breathe|swallow|open (my )?mouth)|difficulty (breathing|swallowing)/,
  /\b(bleeding|blood)\b[^.?!]*\b(won'?t|not|doesn'?t|isn'?t) stop/,
  /\b(knocked out|broken jaw|accident|fell (down|off)|hit (in|on) the (face|mouth))\b/,
  /\bfever\b/,
  /\b(unbearable|severe|extreme|excruciating|terrible) (tooth)?(pain|ache)\b/,
  /\b(emergency|urgent(ly)?|asap right now)\b/,
];

const CLINICAL_QUESTION = [
  /\bshould i\b(?![^.?!]*\b(book|come|visit|bring|call)\b)/,
  /\bdo i (need|have)\b(?![^.?!]*\b(appointment|booking|to book|to bring|documents?|id)\b)/,
  /\bis (it|this|that) (normal|serious|safe|dangerous|infected|an infection)\b/,
  /\b(what|which) (medicine|medication|tablet|antibiotic|painkiller|pain killer)\b/,
  /\bcan i (take|use|eat|drink)\b/,
  /\b(which|what)('s| is)? (better|best)\b[^.?!]*\b(for me|braces|aligners?|implants?|bridge|crown|veneers?|filling|root canal)\b/,
  /\b(braces|aligners?|implants?|bridge|crown|veneers?)\b[^.?!]*\bor\b[^.?!]*\b(braces|aligners?|implants?|bridge|crown|veneers?)\b[^.?!]*\?/,
  /\bwhat('s| is) wrong with\b/,
  /\bdiagnos/,
  /\bwill (it|this) (hurt|heal|go away)\b/,
  /\bhow long (will|does) (it|this) take to heal\b/,
  /\b(ibuprofen|paracetamol|amoxicillin|antibiotics?|painkillers?)\b/,
];

const SYMPTOM_MENTION = /\b(pain|painful|toothache|tooth ache|ache|aching|sensitiv(e|ity)|bleeding gums?|cavity|cavities|decay|broken tooth|chipped|cracked|loose tooth|swelling|swollen|abscess|pus|wisdom tooth (is )?(hurting|coming))\b/;

const OPT_OUT = /^\s*(stop|unsubscribe|opt ?out)\s*[.!]*\s*$|\b(don'?t|do not|stop) (message|messaging|contact|contacting|texting|whatsapp(ing)?) me\b|\bremove (me|my number)\b|\bunsubscribe\b/;

const HUMAN = /\b(talk|speak|chat) (to|with) (a |the )?(human|person|someone|real person|receptionist|staff|doctor|dentist|team)\b|\b(call me|call me back|give me a call|can someone call)\b|\b(real|actual) person\b|\bare you a (bot|robot|human)\b/;

export function classifyInbound(text: string): InboundRisk {
  const t = text.toLowerCase();
  if (OPT_OUT.test(t)) return "opt_out";
  if (EMERGENCY.some((r) => r.test(t))) return "emergency";
  if (CLINICAL_QUESTION.some((r) => r.test(t))) return "clinical_question";
  if (HUMAN.test(t)) return "human_request";
  if (SYMPTOM_MENTION.test(t)) return "symptom_mention";
  return null;
}

/**
 * Deterministic pre-model guardrail. Emergencies, clinical questions and opt-outs
 * never reach a model: the reply is fixed and the conversation is routed.
 */
export function inboundGuardrail(ctx: AssistantContext): AssistantReply | null {
  const last = [...ctx.transcript].reverse().find((l) => l.author === "patient");
  if (!last) return null;
  const risk = classifyInbound(last.body);
  const phoneLine = ` You can reach ${ctx.clinic.name} on ${ctx.clinic.phone}.`;

  if (risk === "emergency") {
    return {
      body: `${CLINICAL_ESCALATION_MESSAGE}${phoneLine} ${ctx.clinic.emergencyInstructions}`.trim(),
      intent: "emergency",
      actions: [{ type: "escalate", reason: "Possible urgent dental problem described by patient", urgent: true }],
      provider: "guardrail",
      guardrail: "inbound_emergency",
    };
  }
  if (risk === "clinical_question") {
    return {
      body: `${CLINICAL_ESCALATION_MESSAGE}${phoneLine} I've passed your question to our team so a dental professional can respond.`,
      intent: "clinical_question",
      actions: [{ type: "escalate", reason: "Patient asked a clinical question", urgent: false }],
      provider: "guardrail",
      guardrail: "inbound_clinical",
    };
  }
  if (risk === "opt_out") {
    return {
      body: `Understood. You won't receive any more messages from ${ctx.clinic.name}. If you ever need us, you can message this number or call ${ctx.clinic.phone}.`,
      intent: "opt_out",
      actions: [{ type: "opt_out" }],
      provider: "guardrail",
      guardrail: "inbound_opt_out",
    };
  }
  return null;
}

const CONFIRMATION_CLAIM = /\b(you('| a)re (all )?(booked|confirmed)|(is|has been|have been) (booked|confirmed)|i('ve| have) (booked|confirmed|reserved)|booking (is )?confirmed|see you (on|at|tomorrow))\b/i;

const MEDICAL_ADVICE = [
  /\byou (probably |likely |may |might |will )?(have|need|require)\b[^.?!]*\b(root canal|extraction|filling|infection|implant|braces|aligners?|crown|cavity|surgery|antibiotics?)\b/i,
  /\bi (would )?(recommend|suggest|advise|prescribe)\b[^.?!]*\b(root canal|extraction|filling|antibiotic|painkiller|medicine|ibuprofen|paracetamol|treatment|implant|braces|aligners?)\b/i,
  /\b(take|use) (an? )?(ibuprofen|paracetamol|amoxicillin|antibiotic|painkiller|clove oil|salt water)\b/i,
  /\b(guarantee|guaranteed|100% (safe|painless|success))\b/i,
  /\bsounds like (an? )?(infection|abscess|cavity|decay|gum disease)\b/i,
];

const MONEY = /(?:₹|rs\.?|inr)\s?([\d,]+)/gi;

export interface OutputCheck {
  ok: boolean;
  problems: string[];
}

/**
 * Post-model guardrail for any generative provider. The reply is rejected if it
 * quotes a price the clinic has not configured, claims a confirmation that has
 * not happened, or strays into diagnosis or treatment advice.
 */
export function checkOutput(reply: AssistantReply, ctx: AssistantContext): OutputCheck {
  const problems: string[] = [];
  const allowed = new Set<number>();
  for (const s of ctx.services) if (s.consultationFee) allowed.add(s.consultationFee);
  for (const f of ctx.faqs) for (const m of f.answer.matchAll(MONEY)) allowed.add(Number(m[1].replace(/,/g, "")));
  for (const m of reply.body.matchAll(MONEY)) {
    const n = Number(m[1].replace(/,/g, ""));
    if (!allowed.has(n)) problems.push(`Quoted an unconfigured price (${m[0]})`);
  }
  const books = reply.actions.some((a) => a.type === "book_slot");
  if (!books && CONFIRMATION_CLAIM.test(reply.body)) problems.push("Claimed a confirmation that has not happened");
  if (MEDICAL_ADVICE.some((r) => r.test(reply.body))) problems.push("Gave diagnosis or treatment advice");
  for (const a of reply.actions) {
    if (a.type === "offer_slots" && a.slots.some((s) => !ctx.openSlots.some((o) => o.start === s.start))) {
      problems.push("Offered a slot that is not open");
    }
    if (a.type === "book_slot" && !ctx.openSlots.some((o) => o.start === a.slot.start)) {
      problems.push("Tried to book a slot that is not open");
    }
    if (a.type === "set_service" && !ctx.services.some((s) => s.id === a.serviceId)) {
      problems.push("Referenced a service the clinic does not offer");
    }
  }
  return { ok: problems.length === 0, problems };
}
