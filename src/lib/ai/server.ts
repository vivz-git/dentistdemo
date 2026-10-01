import "server-only";
import { DEFAULT_GROQ_MODEL, GroqAssistant } from "./providers/groq";
import { DemoAssistant } from "./providers/demo";
import type { AIProvider } from "./types";

/**
 * Provider selection happens on the server only.
 * AI_PROVIDER=groq plus GROQ_API_KEY enables gpt-oss-120b on Groq; anything else
 * runs the deterministic demo assistant, so the demo never depends on credentials.
 */
export function getAssistantProvider(): AIProvider {
  const wanted = (process.env.AI_PROVIDER ?? "demo").toLowerCase();
  const key = process.env.GROQ_API_KEY;
  if (wanted === "groq" && key) return new GroqAssistant(key, process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL);
  return new DemoAssistant();
}
