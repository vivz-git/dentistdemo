"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type State = "idle" | "sending" | "sent" | "error";

export function DemoRequestForm() {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (!String(payload.name ?? "").trim() || !String(payload.clinic ?? "").trim() || !String(payload.contact ?? "").trim()) {
      setError("Please fill in your name, clinic and a phone number or email.");
      setState("error");
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/demo-request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      setState("sent");
    } catch {
      setError("We couldn't send that. Please try again in a moment.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="rounded-[8px] border border-line bg-surface p-6" role="status">
        <p className="text-[17px] font-semibold">Thanks. We&apos;ll be in touch within one working day.</p>
        <p className="mt-2 text-[14px] text-ink-2">In the meantime, the live demo shows a full enquiry-to-booking run with synthetic data.</p>
      </div>
    );
  }

  const field = "h-11 w-full rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none";
  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 rounded-[8px] border border-line bg-surface p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[13.5px] font-medium">
          Your name
          <input name="name" autoComplete="name" className={field} />
        </label>
        <label className="grid gap-1.5 text-[13.5px] font-medium">
          Clinic name
          <input name="clinic" autoComplete="organization" className={field} />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <label className="grid gap-1.5 text-[13.5px] font-medium">
          Phone or email
          <input name="contact" autoComplete="email" className={field} />
        </label>
        <label className="grid gap-1.5 text-[13.5px] font-medium">
          Enquiries per month
          <select name="volume" className={field} defaultValue="">
            <option value="" disabled>
              Choose a range
            </option>
            <option>Under 50</option>
            <option>50 to 150</option>
            <option>150 to 400</option>
            <option>More than 400</option>
          </select>
        </label>
      </div>
      {state === "error" && (
        <p className="text-[13.5px] font-medium text-[var(--st-dnc)]" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" variant="primary" size="lg" disabled={state === "sending"}>
          {state === "sending" ? "Sending" : "Book a Demo"}
        </Button>
        <span className="text-[12.5px] text-ink-3">No patient data needed. A 20 minute call.</span>
      </div>
    </form>
  );
}
