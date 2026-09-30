import "server-only";
import { AnthropicAssistant } from "./providers/anthropic";
import { DemoAssistant } from "./providers/demo";
import type { AIProvider } from "./types";

/**
 * Provider selection happens on the server only.
 * AI_PROVIDER=anthropic plus ANTHROPIC_API_KEY enables Claude; anything else runs
 * the deterministic demo assistant, so the demo never depends on credentials.
 */
export function getAssistantProvider(): AIProvider {
  const wanted = (process.env.AI_PROVIDER ?? "demo").toLowerCase();
  if (wanted === "anthropic" && process.env.ANTHROPIC_API_KEY) return new AnthropicAssistant();
  return new DemoAssistant();
}
