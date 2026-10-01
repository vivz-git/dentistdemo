import { bookingProvider } from "@/lib/integrations/booking";
import type { BookingRules, ClinicData, SlotRef } from "@/lib/domain/types";
import type { AssistantContext } from "./types";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function clock(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

/** "Mon to Sat 9:30 am to 7:30 pm (lunch 1:30 pm to 2:30 pm); Sun 10 am to 1 pm" */
export function hoursSummary(rules: BookingRules): string {
  const groups: { days: number[]; text: string }[] = [];
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const h = rules.hours.find((x) => x.day === d);
    const text = !h || !h.open
      ? "closed"
      : `${clock(h.start)} to ${clock(h.end)}${h.breakStart && h.breakEnd ? ` (lunch ${clock(h.breakStart)} to ${clock(h.breakEnd)})` : ""}`;
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.days.push(d);
    else groups.push({ days: [d], text });
  }
  return groups
    .map((g) => {
      const label = g.days.length > 1 ? `${DAY_SHORT[g.days[0]]} to ${DAY_SHORT[g.days[g.days.length - 1]]}` : DAY_SHORT[g.days[0]];
      return `${label} ${g.text}`;
    })
    .join("; ");
}

export function availabilityInput(data: ClinicData, now: Date) {
  return {
    rules: data.clinic.booking,
    timeZone: data.clinic.timezone,
    appointments: [
      ...data.appointments,
      ...data.busyBlocks.map((b) => ({ start: b.start, end: b.end, status: "scheduled" as const })),
    ],
    now,
  };
}

export function lastOfferedSlots(data: ClinicData, conversationId: string): SlotRef[] {
  const offers = data.messages.filter((m) => m.conversationId === conversationId && m.slots?.length);
  return offers[offers.length - 1]?.slots ?? [];
}

export function buildAssistantContext(
  data: ClinicData,
  leadId: string,
  trigger: AssistantContext["trigger"],
  now: Date,
): AssistantContext {
  const lead = data.leads.find((l) => l.id === leadId);
  if (!lead) throw new Error(`Unknown lead ${leadId}`);
  const convo = data.conversations.find((c) => c.leadId === leadId);
  const c = data.clinic;
  const transcript = data.messages
    .filter((m) => m.conversationId === convo?.id && m.kind !== "internal_note")
    .slice(-20)
    .map((m) => ({ author: m.author, body: m.body }));

  return {
    clinic: {
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      whatsapp: c.whatsapp,
      website: c.website,
      mapsUrl: c.mapsUrl,
      parking: c.parking,
      paymentMethods: c.paymentMethods,
      escalationInstructions: c.escalationInstructions,
      emergencyInstructions: c.emergencyInstructions,
      timezone: c.timezone,
      hoursSummary: hoursSummary(c.booking),
      consultationMinutes: c.booking.consultationMinutes,
    },
    services: data.services
      .filter((s) => s.active)
      .map(({ id, name, keywords, consultationType, consultationFee, description }) => ({
        id,
        name,
        keywords,
        consultationType,
        consultationFee,
        description,
      })),
    faqs: data.faqs.filter((f) => f.active).map(({ id, question, answer, keywords }) => ({ id, question, answer, keywords })),
    lead: {
      firstName: lead.name.split(" ")[0],
      source: lead.source,
      status: lead.status,
      serviceId: lead.serviceId,
      preferredTime: lead.intake.preferredTime,
    },
    transcript,
    openSlots: bookingProvider.openSlots(availabilityInput(data, now)),
    lastOfferedSlots: convo ? lastOfferedSlots(data, convo.id) : [],
    slotsToOffer: c.booking.slotsToOffer,
    trigger,
    now: now.toISOString(),
  };
}
