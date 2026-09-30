"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { runAssistant } from "@/lib/ai/pipeline";
import { DemoAssistant } from "@/lib/ai/providers/demo";
import type { AssistantContext, AssistantReply } from "@/lib/ai/types";
import { DEMO_USER_ID } from "@/lib/demo/clinic";
import { SIMULATED_PROSPECTS } from "@/lib/demo/prospects";
import { createDemoData, DEMO_DATA_VERSION } from "@/lib/demo/seed";
import type { BookingRules, Campaign, Clinic, ClinicData, FAQ, LeadStatus, Service, SlotRef, StaffUser } from "@/lib/domain/types";
import { DAY } from "@/lib/time";
import * as A from "./actions";

interface Toast {
  id: string;
  tone: "success" | "info" | "warn";
  text: string;
}

interface DemoState {
  data: ClinicData | null;
  hydrated: boolean;
  typing: Record<string, boolean>;
  toasts: Toast[];
  providerName: string;
  ensureData: () => void;
  resetDemo: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;

  simulateEnquiry: () => string;
  startAiFollowUp: (leadId: string) => Promise<void>;
  sendPatientMessage: (leadId: string, text: string) => Promise<void>;
  sendStaffMessage: (leadId: string, text: string) => void;
  addNote: (leadId: string, text: string) => void;
  takeOver: (leadId: string) => void;
  returnToAI: (leadId: string) => void;
  bookSlot: (leadId: string, slot: SlotRef, by: "ai" | "staff") => A.BookingOutcome;
  setLeadStatus: (leadId: string, status: LeadStatus) => void;
  assignLead: (leadId: string, staffId: string) => void;
  setLeadService: (leadId: string, serviceId: string) => void;
  markRead: (leadId: string) => void;
  markAttended: (appointmentId: string, attended: boolean) => void;

  saveCampaign: (c: Pick<Campaign, "name" | "message" | "audience" | "channel"> & { id?: string }) => string;
  deleteCampaign: (id: string) => void;
  launchCampaign: (id: string) => void;

  updateClinic: (patch: Partial<Clinic>) => void;
  updateBooking: (patch: Partial<BookingRules>) => void;
  upsertService: (s: Service) => void;
  upsertFaq: (f: FAQ) => void;
  deleteFaq: (id: string) => void;
  upsertStaff: (u: StaffUser) => void;
  updateRoi: (patch: Partial<ClinicData["roi"]>) => void;
}

/** Mutate a structured clone and commit, so every action is a single immutable update. */
function mutate(get: () => DemoState, set: (p: Partial<DemoState>) => void, fn: (d: ClinicData) => void) {
  const cur = get().data;
  if (!cur) return;
  const next = structuredClone(cur);
  fn(next);
  set({ data: next });
}

async function generateReply(ctx: AssistantContext): Promise<AssistantReply> {
  try {
    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context: ctx }),
    });
    if (!res.ok) throw new Error(`assistant ${res.status}`);
    const json = (await res.json()) as { reply: AssistantReply };
    return json.reply;
  } catch {
    // Offline or API unavailable: the same pipeline runs in the browser.
    return runAssistant(ctx, new DemoAssistant());
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const staffName = (d: ClinicData) => d.staff.find((s) => s.id === DEMO_USER_ID)?.name ?? "Staff";

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => {
      async function assistantTurn(leadId: string, trigger: "new_lead" | "reply") {
        const d = get().data;
        if (!d) return;
        const convo = d.conversations.find((c) => c.leadId === leadId);
        if (!convo || convo.mode !== "ai") return;
        set({ typing: { ...get().typing, [leadId]: true } });
        const started = Date.now();
        const ctx = A.assistantContextFor(d, leadId, trigger, new Date());
        const reply = await generateReply(ctx);
        // Keep a short, human-feeling typing pause even when the reply is instant.
        const minPause = 900 + Math.min(1400, reply.body.length * 6);
        if (Date.now() - started < minPause) await wait(minPause - (Date.now() - started));
        set({ typing: { ...get().typing, [leadId]: false }, providerName: reply.provider });
        let bookedLabel: string | undefined;
        mutate(get, set, (data) => {
          // The staff may have taken over while we were generating.
          const live = data.conversations.find((c) => c.leadId === leadId);
          if (!live || live.mode !== "ai") return;
          const result = A.applyAssistantReply(data, leadId, reply, new Date());
          if (result.booked) bookedLabel = new Intl.DateTimeFormat("en-IN", { timeZone: data.clinic.timezone, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(result.booked.start));
        });
        if (bookedLabel) get().toast(`Consultation booked for ${bookedLabel}. Reminders scheduled.`, "success");
        if (reply.actions.some((a) => a.type === "escalate")) get().toast("Conversation handed to the front desk.", "warn");
      }

      return {
        data: null,
        hydrated: false,
        typing: {},
        toasts: [],
        providerName: "demo-rules",

        ensureData: () => {
          const d = get().data;
          const stale = d && Date.now() - new Date(d.seededAt).getTime() > 1 * DAY;
          if (!d || d.version !== DEMO_DATA_VERSION || stale) set({ data: createDemoData(new Date()) });
        },
        resetDemo: () => {
          set({ data: createDemoData(new Date()), typing: {} });
          get().toast("Demo data reset.", "info");
        },
        toast: (text, tone = "info") => {
          const id = A.newId("t");
          set({ toasts: [...get().toasts, { id, text, tone }] });
          setTimeout(() => get().dismissToast(id), 4200);
        },
        dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

        simulateEnquiry: () => {
          const d = get().data!;
          const used = new Set(d.leads.map((l) => l.name));
          const p = SIMULATED_PROSPECTS.find((x) => !used.has(x.name)) ?? SIMULATED_PROSPECTS[Math.floor(Math.random() * SIMULATED_PROSPECTS.length)];
          let id = "";
          mutate(get, set, (data) => {
            const lead = A.createLead(
              data,
              {
                name: p.name,
                phone: `+91 9${Math.floor(10000 + Math.random() * 89999)} ${Math.floor(10000 + Math.random() * 89999)}`,
                email: p.source === "website" ? `${p.name.split(" ")[0].toLowerCase()}@example.com` : undefined,
                source: p.source,
                enquiry: p.enquiry,
              },
              new Date(),
            );
            id = lead.id;
          });
          get().toast(`New enquiry from ${p.name}. The assistant is replying.`, "info");
          void assistantTurn(id, "new_lead");
          return id;
        },

        startAiFollowUp: async (leadId) => {
          await assistantTurn(leadId, "new_lead");
        },

        sendPatientMessage: async (leadId, text) => {
          mutate(get, set, (d) => {
            A.addMessage(d, leadId, { author: "patient", kind: "text", body: text }, new Date());
            const lead = A.leadById(d, leadId);
            // A reply from a lost lead reopens it.
            if (lead.status === "lost") A.setStatus(d, lead, "contacted", new Date());
          });
          const convo = get().data?.conversations.find((c) => c.leadId === leadId);
          if (convo?.mode === "ai") await assistantTurn(leadId, "reply");
        },

        sendStaffMessage: (leadId, text) =>
          mutate(get, set, (d) => {
            const convo = A.convoFor(d, leadId);
            if (convo.mode === "ai") A.takeOver(d, leadId, DEMO_USER_ID, staffName(d), new Date());
            A.addMessage(d, leadId, { author: "staff", authorId: DEMO_USER_ID, kind: "text", body: text }, new Date());
            convo.unread = 0;
          }),

        addNote: (leadId, text) =>
          mutate(get, set, (d) => {
            A.addMessage(d, leadId, { author: "staff", authorId: DEMO_USER_ID, kind: "internal_note", body: text }, new Date());
          }),

        takeOver: (leadId) => mutate(get, set, (d) => A.takeOver(d, leadId, DEMO_USER_ID, staffName(d), new Date())),

        returnToAI: (leadId) => mutate(get, set, (d) => A.returnToAI(d, leadId, staffName(d), new Date())),

        bookSlot: (leadId, slot, by) => {
          let outcome: A.BookingOutcome = { ok: false, message: "No data" };
          mutate(get, set, (d) => {
            outcome = A.bookSlot(d, leadId, slot, by, new Date(), by === "staff" ? DEMO_USER_ID : undefined);
          });
          if (outcome.ok) get().toast(`Consultation booked for ${slot.label}. Reminders scheduled.`, "success");
          else get().toast(outcome.message, "warn");
          return outcome;
        },

        setLeadStatus: (leadId, status) =>
          mutate(get, set, (d) => {
            const lead = A.leadById(d, leadId);
            if (status === "do_not_contact") A.optOut(d, leadId, new Date());
            else A.setStatus(d, lead, status, new Date());
          }),

        assignLead: (leadId, staffId) =>
          mutate(get, set, (d) => {
            A.leadById(d, leadId).assignedToId = staffId;
          }),

        setLeadService: (leadId, serviceId) =>
          mutate(get, set, (d) => {
            A.leadById(d, leadId).serviceId = serviceId;
          }),

        markRead: (leadId) => {
          const convo = get().data?.conversations.find((c) => c.leadId === leadId);
          if (!convo || convo.unread === 0) return;
          mutate(get, set, (d) => {
            A.convoFor(d, leadId).unread = 0;
          });
        },

        markAttended: (appointmentId, attended) =>
          mutate(get, set, (d) => {
            const appt = d.appointments.find((a) => a.id === appointmentId);
            if (!appt) return;
            appt.status = attended ? "attended" : "no_show";
            const lead = A.leadById(d, appt.leadId);
            if (attended) A.setStatus(d, lead, "attended", new Date());
            A.addMessage(d, lead.id, { author: "system", kind: "text", body: attended ? `Marked attended by ${staffName(d)}.` : `Marked no-show by ${staffName(d)}.` }, new Date());
          }),

        saveCampaign: (c) => {
          let id = c.id ?? "";
          mutate(get, set, (d) => {
            const existing = c.id ? d.campaigns.find((x) => x.id === c.id) : undefined;
            if (existing) Object.assign(existing, { name: c.name, message: c.message, audience: c.audience, channel: c.channel });
            else {
              id = A.newId("cmp");
              d.campaigns.unshift({ id, clinicId: d.clinic.id, status: "draft", createdAt: new Date().toISOString(), ...c });
            }
          });
          return id;
        },

        deleteCampaign: (id) =>
          mutate(get, set, (d) => {
            d.campaigns = d.campaigns.filter((c) => c.id !== id || c.status !== "draft");
          }),

        launchCampaign: (id) => {
          let recipientIds: string[] = [];
          mutate(get, set, (d) => {
            recipientIds = A.launchCampaign(d, id, new Date()).map((r) => r.id);
          });
          if (recipientIds.length === 0) {
            get().toast("No eligible leads for this audience.", "warn");
            return;
          }
          get().toast(`Campaign launched to ${recipientIds.length} leads (simulated, nothing was sent).`, "success");
          // Replies arrive over the next few seconds, compressed from ~48 hours.
          recipientIds.forEach((rid, i) => {
            const script = A.SIMULATED_REPLIES[i % A.SIMULATED_REPLIES.length];
            setTimeout(async () => {
              const d = get().data;
              const rec = d?.recipients.find((r) => r.id === rid);
              if (!d || !rec) return;
              if (!script.reply) {
                mutate(get, set, (x) => {
                  const r = x.recipients.find((y) => y.id === rid);
                  if (r) r.status = "no_response";
                });
                return;
              }
              mutate(get, set, (x) => {
                A.addMessage(x, rec.leadId, { author: "patient", kind: "text", body: script.reply! }, new Date());
                const lead = A.leadById(x, rec.leadId);
                lead.reactivatedFromCampaignId = id;
                const r = x.recipients.find((y) => y.id === rid)!;
                r.status = "replied";
                r.reply = script.reply;
                r.repliedAt = new Date().toISOString();
                if (lead.status === "lost") A.setStatus(x, lead, "contacted", new Date());
              });
              const snapshot = get().data!;
              const ctx = A.assistantContextFor(snapshot, rec.leadId, "reply", new Date());
              const reply = await runAssistant(ctx, new DemoAssistant());
              mutate(get, set, (x) => {
                A.applyAssistantReply(x, rec.leadId, reply, new Date());
                const lead = A.leadById(x, rec.leadId);
                const r = x.recipients.find((y) => y.id === rid)!;
                if (script.status === "booked") {
                  const offer = reply.actions.find((a) => a.type === "offer_slots");
                  const slot = offer && offer.type === "offer_slots" ? offer.slots[0] : undefined;
                  if (slot) {
                    A.addMessage(x, rec.leadId, { author: "patient", kind: "text", body: "1" }, new Date(Date.now() + 5));
                    A.bookSlot(x, rec.leadId, slot, "ai", new Date(Date.now() + 10));
                  }
                }
                if (script.status === "interested") A.advance(x, lead, "qualified", new Date());
                r.status =
                  lead.status === "booked" ? "booked" : lead.status === "do_not_contact" ? "unsubscribed" : lead.status === "needs_human" ? "needs_human" : lead.status === "qualified" ? "interested" : "replied";
              });
            }, 700 + i * 450);
          });
          setTimeout(
            () =>
              mutate(get, set, (d) => {
                const c = d.campaigns.find((x) => x.id === id);
                if (c && c.status === "active") c.status = "completed";
              }),
            1500 + recipientIds.length * 450,
          );
        },

        updateClinic: (patch) => mutate(get, set, (d) => Object.assign(d.clinic, patch)),
        updateBooking: (patch) => mutate(get, set, (d) => Object.assign(d.clinic.booking, patch)),
        upsertService: (s) =>
          mutate(get, set, (d) => {
            const i = d.services.findIndex((x) => x.id === s.id);
            if (i >= 0) d.services[i] = s;
            else d.services.push(s);
          }),
        upsertFaq: (f) =>
          mutate(get, set, (d) => {
            const i = d.faqs.findIndex((x) => x.id === f.id);
            if (i >= 0) d.faqs[i] = f;
            else d.faqs.push(f);
          }),
        deleteFaq: (id) => mutate(get, set, (d) => void (d.faqs = d.faqs.filter((f) => f.id !== id))),
        upsertStaff: (u) =>
          mutate(get, set, (d) => {
            const i = d.staff.findIndex((x) => x.id === u.id);
            if (i >= 0) d.staff[i] = u;
            else d.staff.push(u);
          }),
        updateRoi: (patch) => mutate(get, set, (d) => Object.assign(d.roi, patch)),
      };
    },
    {
      name: "consultflow-demo",
      version: DEMO_DATA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ data: s.data }),
      migrate: () => ({ data: null }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.ensureData();
          useDemoStore.setState({ hydrated: true });
        }
      },
    },
  ),
);

