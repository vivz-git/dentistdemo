import { NextResponse } from "next/server";

/**
 * Sales demo requests. In the MVP this validates and logs server-side only.
 * Wire to a CRM or email provider (server-side key) before launch.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const clean = (v: unknown) => String(v ?? "").trim().slice(0, 200);
  const req = { name: clean(body.name), clinic: clean(body.clinic), contact: clean(body.contact), volume: clean(body.volume) };
  if (!req.name || !req.clinic || !req.contact) {
    return NextResponse.json({ error: "Name, clinic and contact are required" }, { status: 422 });
  }
  console.info("[demo-request]", { ...req, contact: req.contact.replace(/.(?=.{4})/g, "*") });
  return NextResponse.json({ ok: true });
}
