"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Trash } from "@phosphor-icons/react";
import { ChatBubble } from "@/components/app/ChatBubble";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { buildAssistantContext } from "@/lib/ai/context";
import { runAssistant } from "@/lib/ai/pipeline";
import { DemoAssistant } from "@/lib/ai/providers/demo";
import type { AssistantReply } from "@/lib/ai/types";
import { DEMO_CLINIC_ID } from "@/lib/demo/clinic";
import type { FAQ, OpeningHours, Service, StaffUser, UserRole } from "@/lib/domain/types";
import { createLead } from "@/lib/store/actions";
import { useClinicData } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";

const TABS = [
  ["profile", "Clinic profile"],
  ["booking", "Hours and booking"],
  ["services", "Services"],
  ["knowledge", "Knowledge base"],
  ["escalation", "Escalation"],
  ["staff", "Staff"],
  ["integrations", "Integrations"],
] as const;
type Tab = (typeof TABS)[number][0];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const field = "h-9 w-full rounded-[6px] border border-line-strong bg-surface px-2.5 text-[13.5px] text-ink focus:border-ink focus:outline-none";
const area = "w-full rounded-[6px] border border-line-strong bg-surface px-2.5 py-2 text-[13.5px] leading-relaxed text-ink focus:border-ink focus:outline-none";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="pb-16">
      <PageHeader title="Clinic settings" description="Everything the assistant is allowed to say comes from here. If it isn't configured, the assistant says it doesn't know and offers the team." />
      <div className="grid gap-6 px-4 pt-5 sm:px-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 lg:mx-0 lg:grid lg:content-start lg:px-0" aria-label="Settings sections">
          {TABS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-current={tab === k ? "page" : undefined}
              className={clsx("h-9 shrink-0 rounded-[6px] px-3 text-left text-[13.5px]", tab === k ? "bg-ink font-semibold text-white" : "text-ink-2 hover:bg-surface-2 hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "profile" && <Profile />}
          {tab === "booking" && <Booking />}
          {tab === "services" && <Services />}
          {tab === "knowledge" && <Knowledge />}
          {tab === "escalation" && <Escalation />}
          {tab === "staff" && <Staff />}
          {tab === "integrations" && <Integrations />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[8px] border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-[13px] text-ink-2">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}

function useDraft<T>(source: T) {
  const [draft, setDraft] = useState(source);
  const [prev, setPrev] = useState(source);
  // Reset the draft when the saved value changes (e.g. after save or demo reset).
  if (prev !== source) {
    setPrev(source);
    setDraft(source);
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(source);
  return [draft, setDraft, dirty] as const;
}

function SaveBar({ dirty, onSave, onReset }: { dirty: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-5 flex items-center gap-2 border-t border-line pt-4">
      <Button variant="primary" onClick={onSave} disabled={!dirty}>
        Save changes
      </Button>
      <Button variant="ghost" onClick={onReset} disabled={!dirty}>
        Discard
      </Button>
      {!dirty && <span className="text-[12.5px] text-ink-3">All changes saved</span>}
    </div>
  );
}

function Profile() {
  const data = useClinicData();
  const src = data.clinic;
  const [d, setD, dirty] = useDraft({ name: src.name, address: src.address, city: src.city, phone: src.phone, whatsapp: src.whatsapp, email: src.email, website: src.website, parking: src.parking, payment: src.paymentMethods.join("\n") });
  const store = useDemoStore.getState;
  return (
    <Panel title="Clinic profile" description="Used in replies, confirmations and reminders.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Clinic name">
          <input className={field} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <Field label="Website">
          <input className={field} value={d.website} onChange={(e) => setD({ ...d, website: e.target.value })} />
        </Field>
        <Field label="Address">
          <input className={field} value={d.address} onChange={(e) => setD({ ...d, address: e.target.value })} />
        </Field>
        <Field label="City and PIN">
          <input className={field} value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={field} value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} />
        </Field>
        <Field label="WhatsApp number">
          <input className={field} value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={field} value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Parking and directions">
            <textarea rows={2} className={area} value={d.parking} onChange={(e) => setD({ ...d, parking: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Accepted payment methods" hint="One per line. The assistant only mentions what's listed.">
            <textarea rows={4} className={area} value={d.payment} onChange={(e) => setD({ ...d, payment: e.target.value })} />
          </Field>
        </div>
      </div>
      <SaveBar
        dirty={dirty}
        onReset={() => setD({ name: src.name, address: src.address, city: src.city, phone: src.phone, whatsapp: src.whatsapp, email: src.email, website: src.website, parking: src.parking, payment: src.paymentMethods.join("\n") })}
        onSave={() => {
          const { payment, ...rest } = d;
          store().updateClinic({ ...rest, paymentMethods: payment.split("\n").map((s) => s.trim()).filter(Boolean) });
          store().toast("Clinic profile saved.", "success");
        }}
      />
    </Panel>
  );
}

function Booking() {
  const data = useClinicData();
  const rules = data.clinic.booking;
  const [d, setD, dirty] = useDraft(rules);
  const [newBlackout, setNewBlackout] = useState("");
  const store = useDemoStore.getState;
  const setHours = (day: number, patch: Partial<OpeningHours>) => setD({ ...d, hours: d.hours.map((h) => (h.day === day ? { ...h, ...patch } : h)) });
  return (
    <Panel title="Hours and booking rules" description="Availability is calculated from these rules and the existing diary. The assistant can only offer times this produces.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Consultation length (minutes)">
          <input type="number" min={10} step={5} className={field} value={d.consultationMinutes} onChange={(e) => setD({ ...d, consultationMinutes: Number(e.target.value) })} />
        </Field>
        <Field label="Buffer between slots (minutes)">
          <input type="number" min={0} step={5} className={field} value={d.bufferMinutes} onChange={(e) => setD({ ...d, bufferMinutes: Number(e.target.value) })} />
        </Field>
        <Field label="Minimum notice (hours)">
          <input type="number" min={0} className={field} value={d.minNoticeHours} onChange={(e) => setD({ ...d, minNoticeHours: Number(e.target.value) })} />
        </Field>
        <Field label="Booking window (days)">
          <input type="number" min={1} max={60} className={field} value={d.maxDaysAhead} onChange={(e) => setD({ ...d, maxDaysAhead: Number(e.target.value) })} />
        </Field>
        <Field label="Times offered per message">
          <input type="number" min={1} max={6} className={field} value={d.slotsToOffer} onChange={(e) => setD({ ...d, slotsToOffer: Number(e.target.value) })} />
        </Field>
        <Field label="No-reply follow-up after (hours)">
          <input type="number" min={1} className={field} value={d.noReplyNudgeHours} onChange={(e) => setD({ ...d, noReplyNudgeHours: Number(e.target.value) })} />
        </Field>
      </div>
      <div className="mt-4 flex flex-wrap gap-5 text-[13.5px]">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.reminder24h} onChange={(e) => setD({ ...d, reminder24h: e.target.checked })} className="size-4 accent-[var(--ink)]" /> Reminder 24 hours before
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={d.reminder2h} onChange={(e) => setD({ ...d, reminder2h: e.target.checked })} className="size-4 accent-[var(--ink)]" /> Reminder 2 hours before
        </label>
      </div>

      <h3 className="mt-6 text-[14px] font-semibold">Working hours</h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead className="text-left text-[12px] text-ink-2">
            <tr>
              <th className="py-2 font-medium">Day</th>
              <th className="py-2 font-medium">Open</th>
              <th className="py-2 font-medium">From</th>
              <th className="py-2 font-medium">To</th>
              <th className="py-2 font-medium">Break from</th>
              <th className="py-2 font-medium">Break to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const h = d.hours.find((x) => x.day === day)!;
              return (
                <tr key={day}>
                  <td className="py-2 pr-3">{DAYS[day]}</td>
                  <td className="py-2 pr-3">
                    <input type="checkbox" checked={h.open} onChange={(e) => setHours(day, { open: e.target.checked })} className="size-4 accent-[var(--ink)]" aria-label={`${DAYS[day]} open`} />
                  </td>
                  {(["start", "end", "breakStart", "breakEnd"] as const).map((k) => (
                    <td key={k} className="py-2 pr-3">
                      <input type="time" disabled={!h.open} value={h[k] ?? ""} onChange={(e) => setHours(day, { [k]: e.target.value || undefined })} className={clsx(field, "w-[118px]")} aria-label={`${DAYS[day]} ${k}`} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="mt-6 text-[14px] font-semibold">Blackout dates</h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {d.blackoutDates.map((b) => (
          <span key={b} className="inline-flex items-center gap-1.5 rounded-[4px] bg-surface-2 px-2 py-1 text-[13px] tabular">
            {b}
            <button onClick={() => setD({ ...d, blackoutDates: d.blackoutDates.filter((x) => x !== b) })} aria-label={`Remove ${b}`} className="text-ink-3 hover:text-ink">
              <Trash className="size-3.5" />
            </button>
          </span>
        ))}
        <input type="date" value={newBlackout} onChange={(e) => setNewBlackout(e.target.value)} className={clsx(field, "w-[160px]")} aria-label="New blackout date" />
        <Button
          size="sm"
          variant="secondary"
          disabled={!newBlackout}
          onClick={() => {
            setD({ ...d, blackoutDates: [...new Set([...d.blackoutDates, newBlackout])].sort() });
            setNewBlackout("");
          }}
        >
          Add date
        </Button>
      </div>
      <SaveBar
        dirty={dirty}
        onReset={() => setD(rules)}
        onSave={() => {
          store().updateBooking(d);
          store().toast("Booking rules saved. Availability updated.", "success");
        }}
      />
    </Panel>
  );
}

function Services() {
  const data = useClinicData();
  const upsert = useDemoStore((s) => s.upsertService);
  const [editing, setEditing] = useState<Service | null>(null);
  return (
    <Panel title="Services and consultation types" description="What the clinic offers, the first consultation for each, and the fee the assistant may quote. Leave the fee empty and the assistant will not quote one.">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[13.5px]">
          <thead className="text-[12px] text-ink-2">
            <tr>
              <th className="py-2 font-medium">Service</th>
              <th className="py-2 font-medium">Consultation type</th>
              <th className="py-2 font-medium">Fee quoted</th>
              <th className="py-2 font-medium">Est. case value</th>
              <th className="py-2 font-medium">Active</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.services.map((s) => (
              <tr key={s.id}>
                <td className="py-2 pr-3 font-medium">{s.name}</td>
                <td className="py-2 pr-3 text-ink-2">{s.consultationType}</td>
                <td className="py-2 pr-3 tabular">{s.consultationFee ? `₹${s.consultationFee}` : <span className="text-ink-3">Not quoted</span>}</td>
                <td className="py-2 pr-3 tabular text-ink-2">₹{s.estimatedCaseValue.toLocaleString("en-IN")}</td>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={s.active} onChange={(e) => upsert({ ...s, active: e.target.checked })} className="size-4 accent-[var(--ink)]" aria-label={`${s.name} active`} />
                </td>
                <td className="py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="mt-3"
        onClick={() => setEditing({ id: `svc_${Date.now().toString(36)}`, clinicId: DEMO_CLINIC_ID, name: "", keywords: [], consultationType: "Dental consultation", estimatedCaseValue: 5000, description: "", active: true })}
      >
        <Plus className="size-4" /> Add service
      </Button>
      {editing && (
        <div className="mt-5 grid gap-4 rounded-[8px] border border-ink p-4 sm:grid-cols-2">
          <Field label="Service name">
            <input className={field} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </Field>
          <Field label="Consultation type">
            <input className={field} value={editing.consultationType} onChange={(e) => setEditing({ ...editing, consultationType: e.target.value })} />
          </Field>
          <Field label="Consultation fee (₹)" hint="Leave empty to never quote a fee.">
            <input type="number" min={0} className={field} value={editing.consultationFee ?? ""} onChange={(e) => setEditing({ ...editing, consultationFee: e.target.value ? Number(e.target.value) : undefined })} />
          </Field>
          <Field label="Estimated case value (₹)" hint="Internal only, for revenue estimates. Never shown to patients.">
            <input type="number" min={0} className={field} value={editing.estimatedCaseValue} onChange={(e) => setEditing({ ...editing, estimatedCaseValue: Number(e.target.value) })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Words patients use" hint="Comma separated. Used to recognise what someone is asking about.">
              <input className={field} value={editing.keywords.join(", ")} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea rows={2} className={area} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button
              variant="primary"
              disabled={!editing.name.trim()}
              onClick={() => {
                upsert(editing);
                setEditing(null);
                useDemoStore.getState().toast("Service saved.", "success");
              }}
            >
              Save service
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function Knowledge() {
  const data = useClinicData();
  const upsert = useDemoStore((s) => s.upsertFaq);
  const remove = useDemoStore((s) => s.deleteFaq);
  const [editing, setEditing] = useState<FAQ | null>(null);
  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel title="Knowledge base" description="Answers the assistant may give word for word. Keep them factual and non-clinical.">
        <ul className="grid gap-2">
          {data.faqs.map((f) => (
            <li key={f.id} className={clsx("rounded-[6px] border px-4 py-3", f.active ? "border-line" : "border-dashed border-line-strong opacity-70")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold">{f.question}</div>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{f.answer}</p>
                  <div className="mt-1.5 text-[12px] text-ink-3">Matches: {f.keywords.join(", ")}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
                    <input type="checkbox" checked={f.active} onChange={(e) => upsert({ ...f, active: e.target.checked })} className="size-4 accent-[var(--ink)]" /> On
                  </label>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(f)}>
                    Edit
                  </Button>
                  <button onClick={() => remove(f.id)} className="grid size-8 place-items-center rounded-[6px] text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={`Delete ${f.question}`}>
                    <Trash className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing({ id: `faq_${Date.now().toString(36)}`, clinicId: DEMO_CLINIC_ID, question: "", answer: "", keywords: [], active: true })}>
          <Plus className="size-4" /> Add answer
        </Button>
        {editing && (
          <div className="mt-5 grid gap-4 rounded-[8px] border border-ink p-4">
            <Field label="Question">
              <input className={field} value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} />
            </Field>
            <Field label="Answer" hint="No diagnosis, treatment advice or guarantees.">
              <textarea rows={3} className={area} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} />
            </Field>
            <Field label="Matching words" hint="Comma separated, e.g. parking, car, bike">
              <input className={field} value={editing.keywords.join(", ")} onChange={(e) => setEditing({ ...editing, keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })} />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={!editing.question.trim() || !editing.answer.trim() || editing.keywords.length === 0}
                onClick={() => {
                  upsert(editing);
                  setEditing(null);
                  useDemoStore.getState().toast("Answer saved. The assistant uses it immediately.", "success");
                }}
              >
                Save answer
              </Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Panel>
      <AssistantTester />
    </div>
  );
}

/** Ask the assistant a question against the current configuration, without touching real leads. */
function AssistantTester() {
  const data = useClinicData();
  const [q, setQ] = useState("Is there parking?");
  const [reply, setReply] = useState<AssistantReply | null>(null);
  async function ask() {
    const sandbox = structuredClone(data);
    const now = new Date();
    const lead = createLead(sandbox, { name: "Test Patient", phone: "+91 90000 00000", source: "website", enquiry: "Hi", serviceId: "svc_implants" }, now);
    sandbox.messages.push({ id: "t", clinicId: DEMO_CLINIC_ID, conversationId: sandbox.conversations.find((c) => c.leadId === lead.id)!.id, author: "patient", kind: "text", body: q, createdAt: now.toISOString() });
    setReply(await runAssistant(buildAssistantContext(sandbox, lead.id, "reply", now), new DemoAssistant()));
  }
  return (
    <section className="h-fit rounded-[8px] border border-line bg-surface-2 p-5">
      <h2 className="flex items-center gap-2 text-[16px] font-semibold">
        <ShieldCheck className="size-5" /> Test the assistant
      </h2>
      <p className="mt-1 text-[13px] text-ink-2">Try a question, including a clinical one, to see what a patient would get. Nothing is saved.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} className={field} aria-label="Test question" />
        <Button type="submit" variant="primary">
          Ask
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {["What are your timings?", "How much are implants?", "My tooth hurts, what should I take?", "Do you accept insurance?", "Do you do laser gum surgery?"].map((s) => (
          <button key={s} onClick={() => setQ(s)} className="h-7 rounded-[6px] border border-line-strong bg-surface px-2 text-[12px] text-ink-2 hover:border-ink">
            {s}
          </button>
        ))}
      </div>
      {reply && (
        <div className="mt-4 grid gap-3">
          <ChatBubble author="patient" body={q} />
          <ChatBubble author="ai" kind={reply.guardrail?.startsWith("inbound_") && reply.guardrail !== "inbound_opt_out" ? "escalation" : "text"} body={reply.body || "(books the chosen time)"} />
          <p className="text-[12px] text-ink-3">
            Intent: {reply.intent.replace("_", " ")}
            {reply.guardrail ? ` · guardrail: ${reply.guardrail.replace("_", " ")}` : ""}
            {reply.actions.some((a) => a.type === "escalate") ? " · escalates to staff" : ""}
          </p>
        </div>
      )}
    </section>
  );
}

function Escalation() {
  const data = useClinicData();
  const src = { escalationInstructions: data.clinic.escalationInstructions, emergencyInstructions: data.clinic.emergencyInstructions };
  const [d, setD, dirty] = useDraft(src);
  const store = useDemoStore.getState;
  return (
    <Panel title="Escalation rules" description="When the assistant stops and hands over to a person.">
      <ul className="mb-5 grid gap-2 text-[13.5px] text-ink-2">
        {[
          "Symptoms, pain, swelling, bleeding or any request for clinical advice: fixed safety reply, then staff",
          "Questions about medicines or comparing treatments: fixed safety reply, then staff",
          "Patient asks for a person or a call back: handed to the front desk",
          "No open slot in the booking window: front desk finds a time",
          "Anything the knowledge base doesn't cover: the assistant says so and notes it for staff",
          "STOP or similar: opted out immediately, never contacted again",
        ].map((r) => (
          <li key={r} className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink" /> {r}
          </li>
        ))}
      </ul>
      <div className="grid gap-4">
        <Field label="What patients are told when handed to staff">
          <textarea rows={2} className={area} value={d.escalationInstructions} onChange={(e) => setD({ ...d, escalationInstructions: e.target.value })} />
        </Field>
        <Field label="Urgent symptoms guidance" hint="Shown after the fixed safety message. Keep it to where to seek urgent care.">
          <textarea rows={2} className={area} value={d.emergencyInstructions} onChange={(e) => setD({ ...d, emergencyInstructions: e.target.value })} />
        </Field>
      </div>
      <SaveBar
        dirty={dirty}
        onReset={() => setD(src)}
        onSave={() => {
          store().updateClinic(d);
          store().toast("Escalation rules saved.", "success");
        }}
      />
    </Panel>
  );
}

const ROLE_LABEL: Record<UserRole, string> = { owner: "Owner", manager: "Practice manager", front_desk: "Front desk" };

function Staff() {
  const data = useClinicData();
  const upsert = useDemoStore((s) => s.upsertStaff);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("front_desk");
  return (
    <Panel title="Staff users" description="Who can see leads and take over conversations. Roles are placeholders until real sign-in is connected.">
      <ul className="divide-y divide-line">
        {data.staff.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-2.5">
            <span className="grid size-8 place-items-center rounded-[6px] bg-surface-2 text-[12px] font-semibold">{u.initials}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">{u.name}</span>
              <span className="block text-[12.5px] text-ink-2">{u.email}</span>
            </span>
            <select value={u.role} onChange={(e) => upsert({ ...u, role: e.target.value as UserRole })} className={clsx(field, "w-auto")} aria-label={`${u.name} role`}>
              {Object.entries(ROLE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim() || !email.includes("@")) return;
          const initials = name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
          const u: StaffUser = { id: `usr_${Date.now().toString(36)}`, clinicId: DEMO_CLINIC_ID, name: name.trim(), email: email.trim(), role, initials };
          upsert(u);
          setName("");
          setEmail("");
        }}
      >
        <input className={field} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Full name" />
        <input className={field} placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <select className={field} value={role} onChange={(e) => setRole(e.target.value as UserRole)} aria-label="Role">
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary" disabled={!name.trim() || !email.includes("@")}>
          Add user
        </Button>
      </form>
    </Panel>
  );
}

function Integrations() {
  const provider = useDemoStore((s) => s.providerName);
  const [server, setServer] = useState<string>("checking");
  useEffect(() => {
    fetch("/api/assistant")
      .then((r) => r.json())
      .then((j: { provider: string }) => setServer(j.provider))
      .catch(() => setServer("unavailable (browser fallback)"));
  }, []);
  const rows = [
    ["AI assistant", server === "checking" ? "Checking" : server, "Deterministic demo assistant by default. Set AI_PROVIDER=groq and GROQ_API_KEY on the server to use gpt-oss-120b on Groq. Guardrails run either way."],
    ["WhatsApp", "Simulated", "WhatsApp Business Cloud API adapter planned. Needs a verified business number and approved templates."],
    ["SMS", "Simulated", "Needs a DLT-registered sender ID and templates for India."],
    ["Email", "Simulated", "Needs a verified sending domain."],
    ["Calendar / practice management", "Internal demo booking", "Availability comes from clinic hours plus the demo diary. A PMS or calendar adapter implements the same BookingProvider interface."],
  ];
  return (
    <Panel title="Integrations" description="Demo mode never contacts a real patient. Production adapters plug into the same interfaces.">
      <ul className="divide-y divide-line">
        {rows.map(([name, status, note]) => (
          <li key={name} className="grid gap-1 py-3 sm:grid-cols-[200px_180px_1fr] sm:gap-4">
            <span className="text-[14px] font-medium">{name}</span>
            <span className="text-[13px]">
              <span className="rounded-[4px] bg-surface-2 px-2 py-0.5 font-medium">{status}</span>
            </span>
            <span className="text-[13px] leading-relaxed text-ink-2">{note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] text-ink-3">Last reply generated by: {provider}</p>
    </Panel>
  );
}
