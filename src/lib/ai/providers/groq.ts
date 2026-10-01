import "server-only";
import { z } from "zod";
import { pickSlotsToOffer } from "@/lib/booking/availability";
import { buildSystemPrompt, buildTurnPrompt } from "../prompt";
import { INTENTS, type AIProvider, type AssistantAction, type AssistantContext, type AssistantReply } from "../types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

const TIME_PREFS = ["morning", "afternoon", "evening", "weekend", "any"] as const;

/** Validates the parsed reply; the JSON schema below is what Groq enforces at decode time. */
const ReplySchema = z.object({
  reply: z.string(),
  intent: z.enum(INTENTS),
  service_id: z.string().nullable(),
  time_preference: z.enum(TIME_PREFS).nullable(),
  offer_slots: z.boolean(),
  selected_slot_index: z.number().int().nullable(),
  escalate: z.boolean(),
  escalation_reason: z.string().nullable(),
  not_interested: z.boolean(),
});

/**
 * Strict-mode JSON schema for Groq structured outputs: every property required,
 * optional values expressed as a union with null, and no additional properties.
 */
export const REPLY_JSON_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "The message to send the patient. Plain text, no markdown, no appointment times." },
    intent: { type: "string", enum: [...INTENTS] },
    service_id: { type: ["string", "null"], description: "id of the clinic service the patient is interested in, or null" },
    time_preference: { type: ["string", "null"], enum: [...TIME_PREFS, null] },
    offer_slots: { type: "boolean", description: "true to attach the next open consultation times" },
    selected_slot_index: { type: ["integer", "null"], description: "1-based index into 'Last offered times' when the patient picked one" },
    escalate: { type: "boolean" },
    escalation_reason: { type: ["string", "null"] },
    not_interested: { type: "boolean" },
  },
  required: ["reply", "intent", "service_id", "time_preference", "offer_slots", "selected_slot_index", "escalate", "escalation_reason", "not_interested"],
  additionalProperties: false,
} as const;

interface GroqChatResponse {
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[];
  error?: { message?: string };
}

/**
 * Groq-hosted gpt-oss-120b. Server-only: GROQ_API_KEY never reaches the browser.
 * The model returns structured intent plus a reply; slots, bookings and status
 * changes are still decided by our own code from the returned fields.
 */
export class GroqAssistant implements AIProvider {
  readonly name: string;

  constructor(
    private readonly apiKey: string,
    private readonly model = DEFAULT_GROQ_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.name = `groq:${model}`;
  }

  async respond(ctx: AssistantContext): Promise<AssistantReply> {
    let res = await this.request(ctx);
    // Free-tier keys are rate limited per minute. Wait once if Groq says it's brief; otherwise fall back.
    const wait = Number(res.headers.get("retry-after"));
    if (res.status === 429 && wait > 0 && wait <= 3) {
      await new Promise((r) => setTimeout(r, wait * 1000));
      res = await this.request(ctx);
    }
    return this.parse(res, ctx);
  }

  private request(ctx: AssistantContext) {
    return this.fetchImpl(GROQ_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: buildSystemPrompt(ctx) },
          { role: "user", content: buildTurnPrompt(ctx) },
        ],
        temperature: 0.3,
        // Counted against the per-minute token limit, so keep it close to what a reply needs.
        max_completion_tokens: 800,
        reasoning_effort: "low",
        include_reasoning: false,
        response_format: {
          type: "json_schema",
          json_schema: { name: "assistant_reply", strict: true, schema: REPLY_JSON_SCHEMA },
        },
      }),
    });
  }

  private async parse(res: Response, ctx: AssistantContext): Promise<AssistantReply> {
    const json = (await res.json().catch(() => ({}))) as GroqChatResponse;
    if (!res.ok) throw new Error(`Groq ${res.status}: ${json.error?.message ?? "request failed"}`);
    const choice = json.choices?.[0];
    if (!choice?.message?.content || choice.message.refusal) {
      throw new Error(`Groq returned no usable content (finish_reason=${choice?.finish_reason ?? "none"})`);
    }
    const parsed = ReplySchema.safeParse(JSON.parse(choice.message.content));
    if (!parsed.success) throw new Error(`Groq reply did not match schema: ${parsed.error.issues[0]?.message}`);
    return toAssistantReply(parsed.data, ctx, this.name);
  }
}

/** Map the model's structured fields onto actions our own code executes. */
export function toAssistantReply(out: z.infer<typeof ReplySchema>, ctx: AssistantContext, provider: string): AssistantReply {
  const actions: AssistantAction[] = [];
  if (out.service_id && ctx.services.some((s) => s.id === out.service_id) && out.service_id !== ctx.lead.serviceId) {
    actions.push({ type: "set_service", serviceId: out.service_id });
  }
  if (out.time_preference) actions.push({ type: "set_preferred_time", preference: out.time_preference });
  if (out.escalate) actions.push({ type: "escalate", reason: out.escalation_reason ?? "Assistant requested a human", urgent: false });
  if (out.not_interested) actions.push({ type: "mark_not_interested" });
  if (ctx.trigger === "new_lead") actions.push({ type: "mark_contacted" });

  let body = out.reply.trim();
  // Patients must always be told they are talking to an automated assistant on first contact.
  if (ctx.trigger === "new_lead" && !/automated|assistant/i.test(body)) {
    body = `Hi ${ctx.lead.firstName}, I'm the automated booking assistant for ${ctx.clinic.name}. ${body}`;
  }
  const chosen = out.selected_slot_index != null ? ctx.lastOfferedSlots[out.selected_slot_index - 1] : undefined;
  if (chosen && ctx.openSlots.some((s) => s.start === chosen.start)) {
    // The booking system writes the confirmation, so the model's text is dropped.
    actions.push({ type: "book_slot", slot: chosen });
    body = "";
  } else if (out.offer_slots && !out.escalate) {
    const slots = pickSlotsToOffer(ctx.openSlots, ctx.slotsToOffer, out.time_preference ?? "any", ctx.clinic.timezone);
    if (slots.length) {
      actions.push({ type: "mark_qualified" }, { type: "offer_slots", slots });
      body = `${body}\n${slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n")}`;
    }
  }
  return { body, intent: out.intent, actions, provider };
}
