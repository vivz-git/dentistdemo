import type { Appointment, BookingRules, SlotRef } from "@/lib/domain/types";
import { dateKey, formatSlotLabel, HOUR, MINUTE, parseHM, zonedParts, zonedTime, DAY } from "@/lib/time";

export interface AvailabilityInput {
  rules: BookingRules;
  timeZone: string;
  appointments: Pick<Appointment, "start" | "end" | "status">[];
  now: Date;
}

export type TimePreference = "morning" | "afternoon" | "evening" | "weekend" | "any";

/**
 * Every bookable consultation start between `now + minNotice` and `now + maxDaysAhead`,
 * honouring working hours, breaks, blackout dates and existing appointments.
 * This is the single source of truth for availability: the assistant can only
 * offer slots returned from here, so it can never invent a time.
 */
export function listOpenSlots({ rules, timeZone, appointments, now }: AvailabilityInput): SlotRef[] {
  const earliest = now.getTime() + rules.minNoticeHours * HOUR;
  const horizon = now.getTime() + rules.maxDaysAhead * DAY;
  const step = (rules.consultationMinutes + rules.bufferMinutes) * MINUTE;
  const duration = rules.consultationMinutes * MINUTE;
  const blackout = new Set(rules.blackoutDates);
  const busy = appointments
    .filter((a) => a.status !== "cancelled")
    .map((a) => [new Date(a.start).getTime(), new Date(a.end).getTime()] as const);

  const slots: SlotRef[] = [];
  for (let d = 0; d <= rules.maxDaysAhead; d++) {
    const dayDate = new Date(now.getTime() + d * DAY);
    const p = zonedParts(dayDate, timeZone);
    const key = dateKey(dayDate, timeZone);
    if (blackout.has(key)) continue;
    const hours = rules.hours.find((h) => h.day === p.weekday);
    if (!hours || !hours.open) continue;

    const open = parseHM(hours.start);
    const close = parseHM(hours.end);
    const dayStart = zonedTime(p.year, p.month, p.day, open.h, open.m, timeZone).getTime();
    const dayEnd = zonedTime(p.year, p.month, p.day, close.h, close.m, timeZone).getTime();
    const brk =
      hours.breakStart && hours.breakEnd
        ? [
            zonedTime(p.year, p.month, p.day, parseHM(hours.breakStart).h, parseHM(hours.breakStart).m, timeZone).getTime(),
            zonedTime(p.year, p.month, p.day, parseHM(hours.breakEnd).h, parseHM(hours.breakEnd).m, timeZone).getTime(),
          ]
        : null;

    for (let t = dayStart; t + duration <= dayEnd; t += step) {
      const end = t + duration;
      if (t < earliest || t > horizon) continue;
      if (brk && t < brk[1] && end > brk[0]) continue;
      if (busy.some(([s, e]) => t < e && end > s)) continue;
      const start = new Date(t);
      slots.push({ start: start.toISOString(), end: new Date(end).toISOString(), label: formatSlotLabel(start, timeZone) });
    }
  }
  return slots;
}

function matchesPreference(slot: SlotRef, pref: TimePreference, timeZone: string): boolean {
  if (pref === "any") return true;
  const p = zonedParts(new Date(slot.start), timeZone);
  if (pref === "weekend") return p.weekday === 0 || p.weekday === 6;
  if (pref === "morning") return p.hour < 12;
  if (pref === "afternoon") return p.hour >= 12 && p.hour < 16;
  return p.hour >= 16;
}

/**
 * A short, human-sized selection: spread across days so the patient sees real
 * choice, preferring the requested part of the day when there is one.
 */
export function pickSlotsToOffer(all: SlotRef[], count: number, pref: TimePreference, timeZone: string): SlotRef[] {
  const preferred = all.filter((s) => matchesPreference(s, pref, timeZone));
  const pool = preferred.length >= Math.min(count, 2) ? preferred : all;
  const byDay = new Map<string, SlotRef[]>();
  for (const s of pool) {
    const k = dateKey(new Date(s.start), timeZone);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }
  const days = [...byDay.values()];
  const picked: SlotRef[] = [];
  let round = 0;
  while (picked.length < count && days.some((d) => d.length > round)) {
    for (const d of days) {
      if (picked.length >= count) break;
      // Take a morning-ish and a later slot from each day on successive rounds.
      const idx = round === 0 ? 0 : Math.min(d.length - 1, Math.floor((d.length * round) / 2));
      const s = d[idx];
      if (s && !picked.includes(s)) picked.push(s);
    }
    round++;
    if (round > 4) break;
  }
  return picked.sort((a, b) => a.start.localeCompare(b.start)).slice(0, count);
}

export function isSlotStillOpen(slot: Pick<SlotRef, "start" | "end">, input: AvailabilityInput): boolean {
  return listOpenSlots(input).some((s) => s.start === slot.start);
}
