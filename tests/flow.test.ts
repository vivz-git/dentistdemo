import { describe, expect, it } from "vitest";
import { buildAssistantContext } from "@/lib/ai/context";
import { CLINICAL_ESCALATION_MESSAGE, checkOutput, classifyInbound } from "@/lib/ai/guardrails";
import { runAssistant } from "@/lib/ai/pipeline";
import { DemoAssistant } from "@/lib/ai/providers/demo";
import type { AIProvider } from "@/lib/ai/types";
import { listOpenSlots } from "@/lib/booking/availability";
import { dashboardKpis, funnel, leadsInWindow } from "@/lib/analytics/metrics";
import { createDemoData } from "@/lib/demo/seed";
import * as A from "@/lib/store/actions";
import { zonedParts } from "@/lib/time";

const NOW = new Date("2026-09-30T06:30:00Z"); // Wed 12:00 IST
const ai = new DemoAssistant();

async function turn(data: ReturnType<typeof createDemoData>, leadId: string, trigger: "new_lead" | "reply", at: Date) {
  const reply = await runAssistant(buildAssistantContext(data, leadId, trigger, at), ai);
  return { reply, result: A.applyAssistantReply(data, leadId, reply, at) };
}

describe("demo data", () => {
  it("seeds a realistic operating clinic", () => {
    const d = createDemoData(NOW);
    expect(d.leads.length).toBeGreaterThanOrEqual(25);
    expect(d.leads.every((l) => l.demo)).toBe(true);
    expect(d.conversations.length).toBe(d.leads.length);
    expect(d.appointments.length).toBeGreaterThan(10);
    expect(d.campaigns.some((c) => c.status === "completed")).toBe(true);
    for (const s of ["new", "contacted", "qualified", "booked", "attended", "lost", "needs_human", "do_not_contact"] as const) {
      expect(d.leads.some((l) => l.status === s)).toBe(true);
    }
    const f = funnel(leadsInWindow(d, NOW, 30));
    expect(f.enquiries).toBeGreaterThan(f.contacted - 1);
    expect(f.contacted).toBeGreaterThanOrEqual(f.qualified);
    expect(f.qualified).toBeGreaterThanOrEqual(f.booked);
    expect(f.booked).toBeGreaterThanOrEqual(f.attended);
  });

  it("never double-books seeded appointments", () => {
    const d = createDemoData(NOW);
    const live = d.appointments.filter((a) => a.status !== "cancelled");
    expect(new Set(live.map((a) => a.start)).size).toBe(live.length);
  });
});

describe("availability", () => {
  it("only offers slots inside opening hours, outside breaks and blackouts", () => {
    const d = createDemoData(NOW);
    const slots = listOpenSlots({ rules: d.clinic.booking, timeZone: d.clinic.timezone, appointments: [], now: NOW });
    expect(slots.length).toBeGreaterThan(50);
    for (const s of slots) {
      const p = zonedParts(new Date(s.start), d.clinic.timezone);
      const h = d.clinic.booking.hours.find((x) => x.day === p.weekday)!;
      expect(h.open).toBe(true);
      const mins = p.hour * 60 + p.minute;
      const [oh, om] = h.start.split(":").map(Number);
      expect(mins).toBeGreaterThanOrEqual(oh * 60 + om);
      if (h.breakStart) {
        const [bh, bm] = h.breakStart.split(":").map(Number);
        const [eh, em] = h.breakEnd!.split(":").map(Number);
        expect(mins + 30 <= bh * 60 + bm || mins >= eh * 60 + em).toBe(true);
      }
      expect(new Date(s.start).getTime()).toBeGreaterThanOrEqual(NOW.getTime() + 3 * 3600_000);
    }
  });
});

describe("guardrails", () => {
  it("classifies risky inbound messages", () => {
    expect(classifyInbound("My face is swollen and the pain is unbearable")).toBe("emergency");
    expect(classifyInbound("Which is better for me, braces or aligners?")).toBe("clinical_question");
    expect(classifyInbound("Can I take ibuprofen?")).toBe("clinical_question");
    expect(classifyInbound("STOP")).toBe("opt_out");
    expect(classifyInbound("Can I speak to someone?")).toBe("human_request");
    expect(classifyInbound("Do I need an appointment for a cleaning?")).toBe(null);
    expect(classifyInbound("Evenings work best")).toBe(null);
  });

  it("escalates clinical questions with the approved wording and never calls the provider", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "+91 90000 00000", source: "website", enquiry: "Implants please" }, NOW);
    await turn(d, lead.id, "new_lead", NOW);
    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Is it normal that my gums bleed? What should I take?" }, NOW);
    let called = false;
    const spy: AIProvider = { name: "spy", respond: async () => ((called = true), { body: "x", intent: "other", actions: [], provider: "spy" }) };
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), spy);
    expect(called).toBe(false);
    expect(reply.body.startsWith(CLINICAL_ESCALATION_MESSAGE)).toBe(true);
    A.applyAssistantReply(d, lead.id, reply, NOW);
    expect(A.leadById(d, lead.id).status).toBe("needs_human");
    expect(A.convoFor(d, lead.id).mode).toBe("human");
  });

  it("rejects model output that invents prices, confirmations or advice", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "+91 90000 00000", source: "website", enquiry: "Hi" }, NOW);
    const ctx = buildAssistantContext(d, lead.id, "reply", NOW);
    expect(checkOutput({ body: "Implants cost ₹25,000.", intent: "other", actions: [], provider: "x" }, ctx).ok).toBe(false);
    expect(checkOutput({ body: "You're booked for Tuesday!", intent: "other", actions: [], provider: "x" }, ctx).ok).toBe(false);
    expect(checkOutput({ body: "Sounds like an infection, take ibuprofen.", intent: "other", actions: [], provider: "x" }, ctx).ok).toBe(false);
    expect(checkOutput({ body: "The implant consultation is ₹500.", intent: "other", actions: [], provider: "x" }, ctx).ok).toBe(true);
    const bad: AIProvider = { name: "bad", respond: async () => ({ body: "Whitening is ₹4,999 this week only!", intent: "other", actions: [], provider: "bad" }) };
    const reply = await runAssistant(ctx, bad);
    expect(reply.guardrail).toBe("output_rejected");
    expect(reply.body).not.toContain("4,999");
  });
});

describe("lead to booking workflow", () => {
  it("moves a new enquiry through contacted, qualified and booked, and updates the dashboard", async () => {
    const d = createDemoData(NOW);
    const before = dashboardKpis(d, NOW);
    const lead = A.createLead(d, { name: "Ishaan Bhatia", phone: "+91 90000 11111", source: "website", enquiry: "Hi, do you do implants? I'd like a consultation." }, NOW);
    expect(lead.status).toBe("new");

    const t1 = new Date(NOW.getTime() + 20_000);
    const { reply: greet } = await turn(d, lead.id, "new_lead", t1);
    expect(greet.intent).toBe("greeting");
    expect(lead.serviceId).toBe("svc_implants");
    expect(A.leadById(d, lead.id).status).toBe("contacted");
    expect(A.leadById(d, lead.id).firstResponseSeconds).toBe(20);

    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Evenings work best for me" }, t1);
    const { reply: offer } = await turn(d, lead.id, "reply", t1);
    const slots = offer.actions.find((a) => a.type === "offer_slots");
    expect(slots && slots.type === "offer_slots" && slots.slots.length).toBe(3);
    expect(A.leadById(d, lead.id).status).toBe("qualified");
    if (slots?.type === "offer_slots") {
      for (const s of slots.slots) expect(zonedParts(new Date(s.start), d.clinic.timezone).hour).toBeGreaterThanOrEqual(16);
    }

    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Option 2" }, t1);
    const { result } = await turn(d, lead.id, "reply", t1);
    expect(result.booked).toBeDefined();
    const l = A.leadById(d, lead.id);
    expect(l.status).toBe("booked");
    expect(l.appointmentId).toBe(result.booked!.id);
    expect(d.followUps.filter((f) => f.leadId === l.id && f.kind.startsWith("reminder") && f.status === "scheduled").length).toBeGreaterThan(0);
    const confirmation = d.messages.filter((m) => m.conversationId === A.convoFor(d, l.id).id && m.kind === "booking_confirmation");
    expect(confirmation.length).toBe(1);

    const after = dashboardKpis(d, NOW);
    expect(after.booked).toBe(before.booked + 1);
    expect(after.enquiriesToday).toBe(before.enquiriesToday + 1);
  });

  it("refuses to book a slot that is already taken", () => {
    const d = createDemoData(NOW);
    const taken = d.appointments.find((a) => new Date(a.start) > NOW && a.status !== "cancelled")!;
    const lead = A.createLead(d, { name: "X Y", phone: "1", source: "website" }, NOW);
    const r = A.bookSlot(d, lead.id, { start: taken.start, end: taken.end, label: "" }, "staff", NOW);
    expect(r.ok).toBe(false);
  });

  it("supports staff takeover and return to AI", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "1", source: "website", enquiry: "Braces for my son" }, NOW);
    A.takeOver(d, lead.id, "usr_priya", "Priya Nair", NOW);
    expect(A.convoFor(d, lead.id).mode).toBe("human");
    // While staff own the conversation, applying the store's assistant turn is skipped by the store; the pipeline still works.
    A.returnToAI(d, lead.id, "Priya Nair", NOW);
    expect(A.convoFor(d, lead.id).mode).toBe("ai");
  });

  it("handles opt-out", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "1", source: "website", enquiry: "Whitening" }, NOW);
    await turn(d, lead.id, "new_lead", NOW);
    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "STOP" }, NOW);
    await turn(d, lead.id, "reply", NOW);
    expect(A.leadById(d, lead.id).status).toBe("do_not_contact");
    expect(A.leadById(d, lead.id).consentToContact).toBe(false);
  });
});

describe("reactivation", () => {
  it("launches a campaign only to eligible, consenting leads", () => {
    const d = createDemoData(NOW);
    const draft = d.campaigns.find((c) => c.status === "draft")!;
    const eligible = A.eligibleForCampaign(d, draft.audience, NOW);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every((l) => l.consentToContact)).toBe(true);
    const recs = A.launchCampaign(d, draft.id, NOW);
    expect(recs.length).toBe(eligible.length);
    expect(d.campaigns.find((c) => c.id === draft.id)!.status).toBe("active");
    expect(A.eligibleForCampaign(d, draft.audience, NOW).length).toBe(0);
  });

  it("re-opens a lost lead that replies yes and offers slots", async () => {
    const d = createDemoData(NOW);
    const lost = d.leads.find((l) => l.status === "lost" && l.serviceId && l.consentToContact)!;
    A.addMessage(d, lost.id, { author: "patient", kind: "text", body: "Yes, I'm still interested." }, NOW);
    A.setStatus(d, lost, "contacted", NOW);
    const { reply } = await turn(d, lost.id, "reply", NOW);
    expect(reply.actions.some((a) => a.type === "offer_slots")).toBe(true);
    expect(A.leadById(d, lost.id).status).toBe("qualified");
  });
});

describe("assistant replies", () => {
  it("closes politely when the patient booked elsewhere", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "1", source: "website", enquiry: "Whitening please" }, NOW);
    await turn(d, lead.id, "new_lead", NOW);
    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Thanks, I got it done elsewhere." }, NOW);
    const { reply } = await turn(d, lead.id, "reply", NOW);
    expect(reply.intent).toBe("not_interested");
    expect(A.leadById(d, lead.id).status).toBe("lost");
  });

  it("books when the patient taps an offered time label", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Test Patient", phone: "1", source: "website", enquiry: "Implants please" }, NOW);
    await turn(d, lead.id, "new_lead", NOW);
    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Weekday mornings work best" }, NOW);
    const { reply } = await turn(d, lead.id, "reply", NOW);
    const offer = reply.actions.find((a) => a.type === "offer_slots");
    const slot = offer?.type === "offer_slots" ? offer.slots[1] : undefined;
    expect(slot).toBeDefined();
    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: slot!.label }, NOW);
    const { result } = await turn(d, lead.id, "reply", NOW);
    expect(result.booked?.start).toBe(slot!.start);
  });
});
