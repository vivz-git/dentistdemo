import type { SlotRef } from "@/lib/domain/types";
import type { TimePreference } from "@/lib/booking/availability";
import { zonedParts } from "@/lib/time";
import type { AssistantContext } from "./types";

type Services = AssistantContext["services"];
type Faqs = AssistantContext["faqs"];

const norm = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9₹\s]/g, " ").replace(/\s+/g, " ")} `;

export function detectService(text: string, services: Services): Services[number] | undefined {
  const t = norm(text);
  let best: { s: Services[number]; score: number } | undefined;
  for (const s of services) {
    let score = 0;
    for (const k of [s.name, ...s.keywords]) {
      if (t.includes(norm(k))) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s;
}

/** Keyword overlap scoring over configured FAQs only. */
export function matchFaq(text: string, faqs: Faqs): Faqs[number] | undefined {
  const t = norm(text);
  let best: { f: Faqs[number]; score: number } | undefined;
  for (const f of faqs) {
    let score = 0;
    for (const k of f.keywords) if (t.includes(norm(k))) score += 1 + k.length / 10;
    if (score >= 1 && (!best || score > best.score)) best = { f, score };
  }
  return best?.f;
}

export function detectTimePreference(text: string): TimePreference | undefined {
  const t = text.toLowerCase();
  if (/\b(weekend|saturday|sunday|sat|sun)\b/.test(t)) return "weekend";
  if (/\b(evening|after work|after (5|6|five|six)|late)\b/.test(t)) return "evening";
  if (/\b(afternoon|lunch|after lunch|post lunch)\b/.test(t)) return "afternoon";
  if (/\b(morning|early|before work|before (10|11|noon))\b/.test(t)) return "morning";
  if (/\b(any ?time|anytime|whenever|flexible|any day|doesn'?t matter|no preference|soonest|earliest|as soon as possible)\b/.test(t)) return "any";
  return undefined;
}

const WEEKDAY_WORDS: [RegExp, number][] = [
  [/\bsun(day)?\b/, 0],
  [/\bmon(day)?\b/, 1],
  [/\btue(s|sday)?\b/, 2],
  [/\bwed(nesday)?\b/, 3],
  [/\bthu(r|rs|rsday)?\b/, 4],
  [/\bfri(day)?\b/, 5],
  [/\bsat(urday)?\b/, 6],
];

/** Resolve "option 2", "the first one", "Thursday 11am" against the last offer. */
export function matchSlotChoice(text: string, offered: SlotRef[], timeZone: string): SlotRef | undefined {
  if (offered.length === 0) return undefined;
  const t = text.toLowerCase().trim();
  const ordinal: Record<string, number> = { first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, last: offered.length - 1 };
  const num = t.match(/^(?:option\s*)?#?(\d)\s*[.!]?$/) ?? t.match(/\boption\s*#?(\d)\b/);
  if (num) return offered[Number(num[1]) - 1];
  for (const [w, i] of Object.entries(ordinal)) if (new RegExp(`\\b${w}\\b`).test(t)) return offered[i];

  const day = WEEKDAY_WORDS.find(([r]) => r.test(t))?.[1];
  const hourMatch = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  const candidates = offered.filter((s) => {
    const p = zonedParts(new Date(s.start), timeZone);
    if (day !== undefined && p.weekday !== day) return false;
    if (hourMatch) {
      let h = Number(hourMatch[1]);
      const ap = hourMatch[3];
      if (ap === "pm" && h < 12) h += 12;
      if (!ap && h < 8) h += 12; // "5" in a clinic context means 5 pm
      if (p.hour !== h) return false;
      if (hourMatch[2] && p.minute !== Number(hourMatch[2])) return false;
    }
    return day !== undefined || !!hourMatch;
  });
  return candidates.length === 1 ? candidates[0] : undefined;
}

export const BOOKING_INTENT = /\b(book|booking|appointment|appt|slot|available|availability|visit|come in|consult(ation)?|schedule|reserve|when can i)\b/i;
export const PRICE_INTENT = /\b(price|cost|charges?|fees?|how much|rate|rates|expensive|cheap|emi|payment plan|₹|rs\.?)\b/i;
export const AFFIRMATIVE = /^\s*(yes|yeah|yep|yup|sure|ok(ay)?|please|interested|i am interested|haan|ha|go ahead|sounds good|let'?s do it|definitely)\b/i;
export const NOT_INTERESTED = /\b(not interested|no thanks|no thank you|already (booked|done|got it done|visited)|went (somewhere|elsewhere)|found another|not now|maybe later)\b/i;
export const GREETING = /^\s*(hi|hello|hey|namaste|good (morning|afternoon|evening))\b[\s!.,]*$/i;
