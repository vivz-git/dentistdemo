import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { pickSlotsToOffer } from "@/lib/booking/availability";
import { buildSystemPrompt, buildTurnPrompt } from "../prompt";
import { INTENTS, type AIProvider, type AssistantAction, type AssistantContext, type AssistantReply } from "../types";

const ReplySchema = z.object({
  reply: z.string(),
  intent: z.enum(INTENTS),
  service_id: z.string().nullable(),
  time_preference: z.enum(["morning", "afternoon", "evening", "weekend", "any"]).nullable(),
  offer_slots: z.boolean(),
  selected_slot_index: z.number().int().nullable(),
  escalate: z.boolean(),
  escalation_reason: z.string().nullable(),
  not_interested: z.boolean(),
});

/**
 * Claude-backed provider. Server-only: the API key never reaches the browser.
 * The model returns structured intent + a reply; slots, bookings and status
 * changes are still decided by our own code from the returned fields.
 */
export class AnthropicAssistant implements AIProvider {
  readonly name: string;
  private client: Anthropic;
  private model: string;

  constructor(model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5") {
    this.client = new Anthropic();
    this.model = model;
    this.name = `anthropic:${model}`;
  }

  async respond(ctx: AssistantContext): Promise<AssistantReply> {
    const response = await this.client.beta.messages.parse(
      {
        model: this.model,
        max_tokens: 2000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: zodOutputFormat(ReplySchema) },
        system: [{ type: "text", text: buildSystemPrompt(ctx), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: buildTurnPrompt(ctx) }],
      },
      { timeout: 20_000 },
    );

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new Error(`Model returned no usable output (stop_reason=${response.stop_reason})`);
    }
    const out = response.parsed_output;
    const actions: AssistantAction[] = [];
    if (out.service_id && ctx.services.some((s) => s.id === out.service_id) && out.service_id !== ctx.lead.serviceId) {
      actions.push({ type: "set_service", serviceId: out.service_id });
    }
    if (out.time_preference) actions.push({ type: "set_preferred_time", preference: out.time_preference });
    if (out.escalate) actions.push({ type: "escalate", reason: out.escalation_reason ?? "Assistant requested a human", urgent: false });
    if (out.not_interested) actions.push({ type: "mark_not_interested" });
    if (ctx.trigger === "new_lead") actions.push({ type: "mark_contacted" });

    let body = out.reply.trim();
    const chosen = out.selected_slot_index != null ? ctx.lastOfferedSlots[out.selected_slot_index - 1] : undefined;
    if (chosen && ctx.openSlots.some((s) => s.start === chosen.start)) {
      actions.push({ type: "book_slot", slot: chosen });
      body = "";
    } else if (out.offer_slots && !out.escalate) {
      const slots = pickSlotsToOffer(ctx.openSlots, ctx.slotsToOffer, out.time_preference ?? "any", ctx.clinic.timezone);
      if (slots.length) {
        actions.push({ type: "mark_qualified" }, { type: "offer_slots", slots });
        body = `${body}\n${slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n")}`;
      }
    }
    return { body, intent: out.intent, actions, provider: this.name };
  }
}
