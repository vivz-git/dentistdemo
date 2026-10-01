import { NextResponse } from "next/server";
import { runAssistant } from "@/lib/ai/pipeline";
import { getAssistantProvider } from "@/lib/ai/server";
import type { AssistantContext } from "@/lib/ai/types";

/**
 * Generates the next assistant turn. Stateless: the caller sends the context
 * (clinic knowledge, transcript, open slots) and receives a reply plus actions.
 * Provider credentials stay on the server.
 */
export async function POST(request: Request) {
  let ctx: AssistantContext;
  try {
    const body = (await request.json()) as { context?: AssistantContext };
    if (!body.context || !Array.isArray(body.context.transcript) || !body.context.clinic) {
      return NextResponse.json({ error: "Missing assistant context" }, { status: 400 });
    }
    ctx = body.context;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (JSON.stringify(ctx).length > 200_000) {
    return NextResponse.json({ error: "Context too large" }, { status: 413 });
  }
  const reply = await runAssistant(ctx, getAssistantProvider());
  return NextResponse.json({ reply });
}

export async function GET() {
  const provider = getAssistantProvider();
  return NextResponse.json({ provider: provider.name, demoMode: process.env.NEXT_PUBLIC_DEMO_MODE !== "false" });
}
