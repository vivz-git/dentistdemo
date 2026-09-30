import { checkOutput, inboundGuardrail } from "./guardrails";
import { respondDeterministically } from "./providers/demo";
import type { AIProvider, AssistantContext, AssistantReply } from "./types";

/**
 * The one entry point for generating an assistant turn, whichever provider runs.
 * 1. Inbound guardrail: emergencies, clinical questions and opt-outs never reach a model.
 * 2. Provider generates a reply.
 * 3. Output guardrail: a reply that invents prices, confirmations, availability or
 *    medical advice is discarded and the deterministic reply is used instead.
 */
export async function runAssistant(ctx: AssistantContext, provider: AIProvider): Promise<AssistantReply> {
  const blocked = inboundGuardrail(ctx);
  if (blocked) return blocked;

  let reply: AssistantReply;
  try {
    reply = await provider.respond(ctx);
  } catch (err) {
    console.warn(`[assistant] ${provider.name} failed, using deterministic reply:`, err instanceof Error ? err.message : err);
    return respondDeterministically(ctx);
  }

  const check = checkOutput(reply, ctx);
  if (!check.ok) {
    console.warn(`[assistant] output rejected: ${check.problems.join("; ")}`);
    return { ...respondDeterministically(ctx), guardrail: "output_rejected" };
  }
  return reply;
}
