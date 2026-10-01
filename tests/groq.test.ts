import { describe, expect, it } from "vitest";
import { buildAssistantContext } from "@/lib/ai/context";
import { CLINICAL_ESCALATION_MESSAGE } from "@/lib/ai/guardrails";
import { runAssistant } from "@/lib/ai/pipeline";
import { GroqAssistant } from "@/lib/ai/providers/groq";
import { createDemoData } from "@/lib/demo/seed";
import * as A from "@/lib/store/actions";

const NOW = new Date("2026-09-30T06:30:00Z");

function fakeFetch(reply: Record<string, unknown> | null, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const body = reply === null ? { error: { message: "rate limited" } } : { choices: [{ message: { content: JSON.stringify(reply) }, finish_reason: "stop" }] };
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const base = {
  reply: "",
  intent: "other",
  service_id: null,
  time_preference: null,
  offer_slots: false,
  selected_slot_index: null,
  escalate: false,
  escalation_reason: null,
  not_interested: false,
};

function leadWith(text: string) {
  const d = createDemoData(NOW);
  const lead = A.createLead(d, { name: "Ishaan Bhatia", phone: "1", source: "website", enquiry: "Do you do implants?", serviceId: "svc_implants" }, NOW);
  A.addMessage(d, lead.id, { author: "ai", kind: "text", body: "Hi Ishaan, what time of day works?" }, NOW);
  A.addMessage(d, lead.id, { author: "patient", kind: "text", body: text }, NOW);
  return { d, lead };
}

describe("Groq provider (mocked)", () => {
  it("sends a strict structured-output request for gpt-oss-120b", async () => {
    const { d, lead } = leadWith("Evenings please");
    const { impl, calls } = fakeFetch({ ...base, reply: "Here are evening times.", intent: "time_preference", time_preference: "evening", offer_slots: true });
    await new GroqAssistant("test-key", undefined, impl).respond(buildAssistantContext(d, lead.id, "reply", NOW));
    expect(calls[0].url).toBe("https://api.groq.com/openai/v1/chat/completions");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer test-key");
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.reasoning_effort).toBe("low");
    expect(body.include_reasoning).toBe(false);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    const schema = body.response_format.json_schema.schema;
    expect(schema.additionalProperties).toBe(false);
    expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort());
    expect(body.messages[0].content).toContain("SmileCare Dental Clinic");
  });

  it("attaches real open slots itself instead of trusting the model with times", async () => {
    const { d, lead } = leadWith("Evenings please");
    const { impl } = fakeFetch({ ...base, reply: "Here are evening times.", intent: "time_preference", time_preference: "evening", offer_slots: true });
    const ctx = buildAssistantContext(d, lead.id, "reply", NOW);
    const reply = await new GroqAssistant("k", undefined, impl).respond(ctx);
    const offer = reply.actions.find((a) => a.type === "offer_slots");
    expect(offer?.type === "offer_slots" && offer.slots.every((s) => ctx.openSlots.some((o) => o.start === s.start))).toBe(true);
  });

  it("falls back to the deterministic assistant when Groq errors", async () => {
    const { d, lead } = leadWith("Evenings please");
    const { impl } = fakeFetch(null, 429);
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), new GroqAssistant("k", undefined, impl));
    expect(reply.provider).toBe("demo-rules");
    expect(reply.actions.some((a) => a.type === "offer_slots")).toBe(true);
  });

  it("discards a model reply that invents a price", async () => {
    const { d, lead } = leadWith("How much are implants?");
    const { impl } = fakeFetch({ ...base, reply: "Implants cost ₹18,000 this month.", intent: "price_question" });
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), new GroqAssistant("k", undefined, impl));
    expect(reply.guardrail).toBe("output_rejected");
    expect(reply.body).not.toContain("18,000");
  });

  it("discards a model reply that mentions a time that isn't open", async () => {
    const { d, lead } = leadWith("Evenings please");
    const { impl } = fakeFetch({ ...base, reply: "We have a slot at 9:15 pm tonight.", intent: "time_preference", time_preference: "evening" });
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), new GroqAssistant("k", undefined, impl));
    expect(reply.guardrail).toBe("output_rejected");
    expect(reply.body).not.toContain("9:15");
  });

  it("allows times that come from clinic hours", async () => {
    const { d, lead } = leadWith("When do you open?");
    const { impl } = fakeFetch({ ...base, reply: "We open at 9:30 am on weekdays and close at 7:30 pm.", intent: "faq" });
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), new GroqAssistant("k", undefined, impl));
    expect(reply.guardrail).toBeUndefined();
  });

  it("retries once after a short rate-limit wait", async () => {
    const { d, lead } = leadWith("Evenings please");
    let n = 0;
    const impl = (async () => {
      n++;
      if (n === 1) return new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429, headers: { "retry-after": "1" } });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ ...base, reply: "Here are the next open consultation times:", intent: "time_preference", time_preference: "evening", offer_slots: true }) } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const reply = await new GroqAssistant("k", undefined, impl).respond(buildAssistantContext(d, lead.id, "reply", NOW));
    expect(n).toBe(2);
    expect(reply.provider).toBe("groq:openai/gpt-oss-120b");
  });

  it("never sends clinical questions to Groq", async () => {
    const { d, lead } = leadWith("My gums bleed, should I take antibiotics?");
    const { impl, calls } = fakeFetch({ ...base, reply: "Take amoxicillin." });
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), new GroqAssistant("k", undefined, impl));
    expect(calls.length).toBe(0);
    expect(reply.body.startsWith(CLINICAL_ESCALATION_MESSAGE)).toBe(true);
  });
});

const live = process.env.GROQ_API_KEY && process.env.RUN_LIVE_GROQ === "1";

describe.runIf(live)("Groq provider (live API)", () => {
  const groq = () => new GroqAssistant(process.env.GROQ_API_KEY!, process.env.GROQ_MODEL || undefined);

  it("runs a full enquiry to booking conversation", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Ishaan Bhatia", phone: "1", source: "website", enquiry: "Hi, I'm missing a back tooth. Do you do implants? Is there parking?" }, NOW);

    const turn = async (trigger: "new_lead" | "reply") => {
      const reply = await runAssistant(buildAssistantContext(d, lead.id, trigger, NOW), groq());
      A.applyAssistantReply(d, lead.id, reply, NOW);
      if (process.env.LIVE_VERBOSE) process.stderr.write(`\n[${reply.provider} | ${reply.intent} | ${reply.actions.map((a) => a.type).join(",")}]\n${reply.body || "(booking confirmation written by the booking system)"}\n`);
      return reply;
    };

    const greet = await turn("new_lead");
    expect(greet.provider).toBe("groq:openai/gpt-oss-120b");
    expect(greet.body.length).toBeGreaterThan(20);
    // It may answer and offer times in one go, which moves the lead straight to Qualified.
    expect(["contacted", "qualified"]).toContain(A.leadById(d, lead.id).status);

    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Evenings after 5 work best for me. Can I book?" }, NOW);
    const offer = await turn("reply");
    expect(offer.provider).toBe("groq:openai/gpt-oss-120b");
    expect(offer.actions.some((a) => a.type === "offer_slots")).toBe(true);

    A.addMessage(d, lead.id, { author: "patient", kind: "text", body: "Option 2 please" }, NOW);
    await turn("reply");
    expect(A.leadById(d, lead.id).status).toBe("booked");
  }, 60_000);

  it("answers from configured information without inventing prices", async () => {
    const { d, lead } = leadWith("How much does a dental implant cost in total?");
    const reply = await runAssistant(buildAssistantContext(d, lead.id, "reply", NOW), groq());
    if (process.env.LIVE_VERBOSE) process.stderr.write(`\n[price question | ${reply.provider}]\n${reply.body}\n`);
    expect(reply.guardrail).not.toBe("output_rejected");
    const amounts = [...reply.body.matchAll(/₹\s?([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, "")));
    expect(amounts.every((n) => n === 500 || n === 20000)).toBe(true);
  }, 30_000);
});

describe("Groq provider disclosure", () => {
  it("always discloses the automated assistant on first contact", async () => {
    const d = createDemoData(NOW);
    const lead = A.createLead(d, { name: "Ishaan Bhatia", phone: "1", source: "website", enquiry: "Implants?" }, NOW);
    const { impl } = fakeFetch({ ...base, reply: "Yes, we offer implants.", intent: "service_interest", service_id: "svc_implants" });
    const reply = await new GroqAssistant("k", undefined, impl).respond(buildAssistantContext(d, lead.id, "new_lead", NOW));
    expect(reply.body).toMatch(/^Hi Ishaan, I'm the automated booking assistant for SmileCare Dental Clinic\./);
  });
});
