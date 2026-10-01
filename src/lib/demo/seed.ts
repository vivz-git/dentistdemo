import { listOpenSlots } from "@/lib/booking/availability";
import type {
  Appointment,
  BusyBlock,
  Campaign,
  CampaignRecipient,
  ClinicData,
  Conversation,
  FollowUp,
  Lead,
  LeadSource,
  LeadStatus,
  Message,
  MessageAuthor,
  MessageKind,
  RecipientStatus,
  SlotRef,
} from "@/lib/domain/types";
import { DAY, formatSlotLabel, HOUR, MINUTE, parseHM, zonedParts, zonedTime } from "@/lib/time";
import { withArticle } from "@/lib/text";
import { DEMO_CLINIC_ID, demoClinic, demoFaqs, demoServices, demoStaff } from "./clinic";

export const DEMO_DATA_VERSION = 4;

/** Small deterministic PRNG so the demo looks the same on every reset. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type ServiceKey = "implants" | "aligners" | "braces" | "rct" | "whitening" | "veneers" | "checkup" | "wisdom" | "kids";
const SID = (k?: ServiceKey) => (k ? `svc_${k}` : undefined);

interface Spec {
  name: string;
  source: LeadSource;
  service?: ServiceKey;
  status: LeadStatus;
  /** Days ago + "HH:MM", or minutes ago for today's leads. */
  when: [number, string] | { minutesAgo: number };
  script?: string;
}

// Recent enquiries: the last 30 days of a busy clinic.
const RECENT: Spec[] = [
  { name: "Ananya Krishnan", source: "website", service: "aligners", status: "contacted", when: { minutesAgo: 7 } },
  { name: "Mohammed Irfan", source: "phone", status: "new", when: { minutesAgo: 22 } },
  { name: "Lakshmi Venkatesh", source: "phone", status: "new", when: { minutesAgo: 48 } },
  { name: "Rahul Menon", source: "website", service: "implants", status: "booked", when: { minutesAgo: 95 }, script: "rahul" },
  { name: "Arjun Iyer", source: "whatsapp", service: "rct", status: "needs_human", when: { minutesAgo: 140 }, script: "arjun" },
  { name: "Divya Shetty", source: "instagram", service: "whitening", status: "qualified", when: { minutesAgo: 230 } },
  { name: "Karthik Rao", source: "google", service: "checkup", status: "booked", when: { minutesAgo: 320 } },
  { name: "Sneha Kulkarni", source: "instagram", service: "aligners", status: "qualified", when: [1, "18:40"], script: "sneha" },
  { name: "Vikram Joshi", source: "website", service: "aligners", status: "needs_human", when: [1, "21:15"], script: "vikram" },
  { name: "Fatima Sheikh", source: "whatsapp", service: "braces", status: "booked", when: [2, "12:10"], script: "fatima" },
  { name: "Nikhil Agarwal", source: "google", service: "implants", status: "contacted", when: [2, "22:48"] },
  { name: "Priyanka Das", source: "directory", service: "veneers", status: "qualified", when: [2, "16:05"] },
  { name: "Suresh Pillai", source: "phone", service: "rct", status: "booked", when: [3, "10:20"] },
  { name: "Meghna Chatterjee", source: "website", service: "whitening", status: "booked", when: [3, "19:55"] },
  { name: "Ravi Shankar", source: "whatsapp", service: "rct", status: "needs_human", when: [3, "09:05"], script: "ravi" },
  { name: "Aditya Malhotra", source: "instagram", service: "aligners", status: "contacted", when: [4, "23:10"] },
  { name: "Farhan Ali", source: "directory", service: "wisdom", status: "booked", when: [4, "11:55"] },
  { name: "Swati Mishra", source: "website", service: "braces", status: "booked", when: [5, "15:40"] },
  { name: "Madhuri Kulkarni", source: "instagram", service: "whitening", status: "contacted", when: [5, "20:20"] },
  { name: "Imran Qureshi", source: "google", service: "implants", status: "booked", when: [6, "18:05"] },
  { name: "Deepa Natarajan", source: "website", service: "veneers", status: "contacted", when: [6, "21:30"] },
  { name: "Shalini Reddy", source: "google", service: "checkup", status: "qualified", when: [7, "09:20"] },
  { name: "Sameer Bhat", source: "referral", service: "implants", status: "booked", when: [7, "12:30"] },
  { name: "Sanjay Gupta", source: "website", service: "wisdom", status: "attended", when: [8, "20:05"] },
  { name: "Vivek Chawla", source: "directory", service: "implants", status: "qualified", when: [8, "17:45"] },
  { name: "Ritu Saxena", source: "google", service: "checkup", status: "attended", when: [9, "09:45"] },
  { name: "Bhavana Rao", source: "website", service: "kids", status: "booked", when: [9, "13:05"] },
  { name: "Anjali Sinha", source: "whatsapp", service: "whitening", status: "do_not_contact", when: [10, "14:35"] },
  { name: "Rohan Deshmukh", source: "google", service: "rct", status: "attended", when: [11, "08:50"] },
  { name: "Kavitha Menon", source: "referral", service: "braces", status: "qualified", when: [11, "16:40"] },
  { name: "Harpreet Kaur", source: "referral", service: "implants", status: "attended", when: [12, "11:30"] },
  { name: "Zoya Siddiqui", source: "instagram", service: "aligners", status: "lost", when: [13, "23:35"] },
  { name: "Aisha Khan", source: "whatsapp", service: "kids", status: "attended", when: [14, "17:20"] },
  { name: "Tanvi Patil", source: "instagram", service: "aligners", status: "attended", when: [15, "12:45"] },
  { name: "Neha Bhattacharya", source: "instagram", service: "whitening", status: "lost", when: [16, "22:30"] },
  { name: "Sunil Kumar", source: "google", service: "rct", status: "do_not_contact", when: [17, "11:10"] },
  { name: "Varun Kapoor", source: "website", service: "implants", status: "attended", when: [18, "19:10"] },
  { name: "Gaurav Mehta", source: "directory", service: "checkup", status: "lost", when: [19, "13:15"] },
  { name: "Keerthana Subramanian", source: "website", service: "braces", status: "attended", when: [20, "16:25"] },
  { name: "Manoj Tiwari", source: "phone", service: "rct", status: "lost", when: [21, "10:05"] },
  { name: "Prakash Hegde", source: "website", service: "checkup", status: "attended", when: [22, "09:30"] },
  { name: "Pallavi Joshi", source: "instagram", service: "veneers", status: "attended", when: [23, "18:15"] },
  { name: "Abhishek Pandey", source: "google", service: "checkup", status: "lost", when: [24, "20:40"] },
  { name: "Isha Arora", source: "website", service: "aligners", status: "attended", when: [26, "21:05"] },
  { name: "Jyoti Yadav", source: "google", service: "checkup", status: "attended", when: [27, "10:50"] },
  { name: "Tarun Nair", source: "website", service: "wisdom", status: "lost", when: [28, "15:20"] },
];

// Older enquiries that never booked: the reactivation pool.
const DORMANT: { name: string; source: LeadSource; service: ServiceKey; daysAgo: number; status: LeadStatus }[] = [
  { name: "Rajesh Khanna", source: "website", service: "implants", daysAgo: 48, status: "lost" },
  { name: "Pooja Bhatt", source: "instagram", service: "aligners", daysAgo: 52, status: "contacted" },
  { name: "Siddharth Verma", source: "google", service: "implants", daysAgo: 57, status: "lost" },
  { name: "Nandini Gowda", source: "website", service: "whitening", daysAgo: 61, status: "contacted" },
  { name: "Akash Jain", source: "directory", service: "braces", daysAgo: 66, status: "lost" },
  { name: "Revathi Suresh", source: "google", service: "veneers", daysAgo: 70, status: "contacted" },
  { name: "Manish Sharma", source: "phone", service: "rct", daysAgo: 74, status: "lost" },
  { name: "Sunita Rao", source: "website", service: "implants", daysAgo: 79, status: "contacted" },
  { name: "Kunal Thakur", source: "instagram", service: "aligners", daysAgo: 83, status: "lost" },
  { name: "Geeta Pillai", source: "google", service: "checkup", daysAgo: 88, status: "lost" },
  { name: "Aman Sethi", source: "website", service: "whitening", daysAgo: 94, status: "contacted" },
  { name: "Lavanya Iyer", source: "instagram", service: "veneers", daysAgo: 99, status: "lost" },
  { name: "Deepak Yadav", source: "directory", service: "implants", daysAgo: 105, status: "lost" },
  { name: "Shreya Ghosh", source: "website", service: "aligners", daysAgo: 112, status: "contacted" },
  { name: "Mahesh Babu Reddy", source: "google", service: "braces", daysAgo: 118, status: "lost" },
  { name: "Asha Kumari", source: "phone", service: "wisdom", daysAgo: 124, status: "lost" },
  { name: "Naveen Prasad", source: "website", service: "implants", daysAgo: 131, status: "contacted" },
  { name: "Ritika Jain", source: "instagram", service: "whitening", daysAgo: 139, status: "lost" },
  { name: "Omkar Desai", source: "google", service: "rct", daysAgo: 147, status: "lost" },
  { name: "Heena Mirza", source: "website", service: "aligners", daysAgo: 156, status: "contacted" },
  { name: "Yash Vardhan", source: "directory", service: "veneers", daysAgo: 168, status: "lost" },
  { name: "Seema Bansal", source: "google", service: "implants", daysAgo: 183, status: "lost" },
];

// Older enquiries already contacted by the completed reactivation campaign.
const CAMPAIGN_POOL: { name: string; source: LeadSource; service: ServiceKey; daysAgo: number; outcome: RecipientStatus; reply?: string }[] = [
  { name: "Prateek Saini", source: "website", service: "implants", daysAgo: 96, outcome: "booked", reply: "Yes, I'm still interested. Can I come next week?" },
  { name: "Meenakshi Sundaram", source: "google", service: "aligners", daysAgo: 104, outcome: "booked", reply: "Yes please, weekend works best." },
  { name: "Aarav Mehrotra", source: "instagram", service: "aligners", daysAgo: 110, outcome: "interested", reply: "Interested, but after the 20th. Will confirm." },
  { name: "Divya Menon", source: "website", service: "implants", daysAgo: 115, outcome: "interested", reply: "Yes. What are the timings on Saturday?" },
  { name: "Harish Chandra", source: "google", service: "implants", daysAgo: 121, outcome: "needs_human", reply: "My gums bleed when I brush, is that related to the implant question?" },
  { name: "Tanya Kapoor", source: "instagram", service: "aligners", daysAgo: 127, outcome: "unsubscribed", reply: "Stop" },
  { name: "Sachin Patil", source: "directory", service: "implants", daysAgo: 133, outcome: "replied", reply: "Already got it done elsewhere, thanks." },
  { name: "Kiran Shetty", source: "website", service: "aligners", daysAgo: 140, outcome: "no_response" },
  { name: "Ramesh Iyer", source: "google", service: "implants", daysAgo: 146, outcome: "no_response" },
  { name: "Bindu Varghese", source: "instagram", service: "aligners", daysAgo: 152, outcome: "no_response" },
  { name: "Arvind Menon", source: "website", service: "implants", daysAgo: 160, outcome: "no_response" },
  { name: "Sonal Agrawal", source: "google", service: "aligners", daysAgo: 171, outcome: "no_response" },
  { name: "Joseph Thomas", source: "directory", service: "implants", daysAgo: 179, outcome: "no_response" },
  { name: "Nisha Choudhary", source: "instagram", service: "aligners", daysAgo: 190, outcome: "no_response" },
];

const ENQUIRY_TEXT: Record<ServiceKey, string[]> = {
  implants: [
    "Hi, I'm looking for implant options for a missing back tooth. Do you do implant consultations?",
    "Looking for dental implants for my father, he is 64. Want to book a consultation.",
    "Do you do implants? I lost a tooth last year.",
  ],
  aligners: [
    "Interested in clear aligners. Want to know the process.",
    "Hi, are invisible aligners available at your clinic?",
    "My teeth are slightly crooked, want aligners before my wedding in March.",
  ],
  braces: ["Want a braces consultation for my son, he is 13.", "Enquiry about braces for adults. I'm 26."],
  rct: ["I was told I need a root canal. Want a second opinion appointment.", "Need an RCT appointment this week if possible."],
  whitening: ["Want teeth whitening before a family function next month.", "Looking for teeth whitening, how does it work?"],
  veneers: ["Interested in veneers for my front teeth.", "Looking for a smile makeover consultation."],
  checkup: ["Want a routine check-up and cleaning.", "Haven't been to a dentist in 3 years, want a cleaning and check-up."],
  wisdom: ["My wisdom tooth is coming out, want it checked.", "Need a wisdom tooth consultation."],
  kids: ["First dental visit for my 5 year old daughter.", "Want a check-up for my 7 year old son."],
};

const PREF_TEXT = ["Evenings are better for me, after 5.", "Weekday mornings work best.", "Saturday if possible.", "Any time is fine.", "Afternoons, after lunch."];
const TIME_Q = "What time of day usually works for you: mornings, afternoons, evenings or weekends?";

export function createDemoData(now: Date = new Date()): ClinicData {
  const rand = mulberry32(20260930);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const tz = demoClinic.timezone;
  const clinic = structuredClone(demoClinic);
  const nowMs = now.getTime();

  // A blackout day about nine days out, so the rule is visible in settings.
  const blackout = new Date(nowMs + 9 * DAY);
  const bp = zonedParts(blackout, tz);
  clinic.booking.blackoutDates = [`${bp.year}-${String(bp.month).padStart(2, "0")}-${String(bp.day).padStart(2, "0")}`];

  const iso = (ms: number) => new Date(ms).toISOString();
  const atDaysAgo = (days: number, hm: string) => {
    const d = zonedParts(new Date(nowMs - days * DAY), tz);
    const { h, m } = parseHM(hm);
    return zonedTime(d.year, d.month, d.day, h, m, tz).getTime();
  };

  const leads: Lead[] = [];
  const conversations: Conversation[] = [];
  const messages: Message[] = [];
  const appointments: Appointment[] = [];
  const followUps: FollowUp[] = [];
  let msgSeq = 0;
  let fuSeq = 0;

  const futureSlots = listOpenSlots({ rules: clinic.booking, timeZone: tz, appointments: [], now });
  const usedStarts = new Set<string>();
  const takeFutureSlot = (seed: number, pref?: (h: number, wd: number) => boolean): SlotRef => {
    const pool = futureSlots.filter((s) => {
      if (usedStarts.has(s.start)) return false;
      if (!pref) return true;
      const p = zonedParts(new Date(s.start), tz);
      return pref(p.hour, p.weekday);
    });
    const list = pool.length ? pool : futureSlots.filter((s) => !usedStarts.has(s.start));
    const s = list[(seed * 7 + 3) % list.length];
    usedStarts.add(s.start);
    return s;
  };

  const slotAt = (ms: number): SlotRef => ({
    start: iso(ms),
    end: iso(ms + clinic.booking.consultationMinutes * MINUTE),
    label: formatSlotLabel(new Date(ms), tz),
  });

  function addLead(base: Omit<Lead, "clinicId" | "demo" | "channel" | "intake" | "milestones" | "consentToContact" | "lastActivityAt"> & Partial<Lead>) {
    const lead: Lead = {
      clinicId: DEMO_CLINIC_ID,
      demo: true,
      channel: base.source === "website" ? "web_chat" : "whatsapp",
      intake: {},
      milestones: {},
      consentToContact: true,
      lastActivityAt: base.createdAt,
      ...base,
    };
    leads.push(lead);
    const convo: Conversation = {
      id: `conv_${lead.id.slice(5)}`,
      clinicId: DEMO_CLINIC_ID,
      leadId: lead.id,
      channel: lead.channel,
      mode: "ai",
      status: "open",
      unread: 0,
      updatedAt: lead.createdAt,
    };
    conversations.push(convo);
    return { lead, convo };
  }

  function say(convo: Conversation, lead: Lead, author: MessageAuthor, ms: number, body: string, extra: Partial<Message> = {}) {
    const kind: MessageKind = extra.kind ?? "text";
    const m: Message = {
      id: `msg_${String(++msgSeq).padStart(4, "0")}`,
      clinicId: DEMO_CLINIC_ID,
      conversationId: convo.id,
      author,
      kind,
      body,
      createdAt: iso(ms),
      ...extra,
    };
    messages.push(m);
    if (ms > new Date(lead.lastActivityAt).getTime()) lead.lastActivityAt = m.createdAt;
    convo.updatedAt = lead.lastActivityAt;
    return ms;
  }

  function followUp(lead: Lead, kind: FollowUp["kind"], dueMs: number, body: string, appointmentId?: string) {
    followUps.push({
      id: `fu_${String(++fuSeq).padStart(3, "0")}`,
      clinicId: DEMO_CLINIC_ID,
      leadId: lead.id,
      appointmentId,
      kind,
      channel: lead.channel === "web_chat" ? "whatsapp" : lead.channel,
      dueAt: iso(dueMs),
      status: dueMs <= nowMs ? "sent" : "scheduled",
      body,
    });
  }

  function book(lead: Lead, convo: Conversation, slot: SlotRef, bookedMs: number, by: "ai" | "staff", status: Appointment["status"]) {
    const svc = demoServices.find((s) => s.id === lead.serviceId);
    const appt: Appointment = {
      id: `apt_${lead.id.slice(5)}`,
      clinicId: DEMO_CLINIC_ID,
      leadId: lead.id,
      serviceId: lead.serviceId,
      start: slot.start,
      end: slot.end,
      status,
      consultationType: svc?.consultationType ?? "Dental consultation",
      bookedBy: by,
      createdAt: iso(bookedMs),
    };
    appointments.push(appt);
    lead.appointmentId = appt.id;
    lead.milestones.bookedAt = iso(bookedMs);
    const startMs = new Date(slot.start).getTime();
    const first = lead.name.split(" ")[0];
    followUp(lead, "reminder_24h", startMs - 24 * HOUR, `Hi ${first}, a reminder of your ${appt.consultationType.toLowerCase()} at SmileCare Dental Clinic tomorrow, ${slot.label}. Reply C to confirm or R to reschedule.`, appt.id);
    followUp(lead, "reminder_2h", startMs - 2 * HOUR, `Hi ${first}, see you at ${formatSlotLabel(new Date(startMs), tz).split(", ").pop()} today. Free parking is in the Lakeview Arcade basement.`, appt.id);
    return appt;
  }

  const greeting = (lead: Lead) => {
    const first = lead.name.split(" ")[0];
    const svc = demoServices.find((s) => s.id === lead.serviceId);
    const opener = lead.source === "phone" ? `Hi ${first}, sorry we missed your call to SmileCare Dental Clinic.` : `Hi ${first}, thanks for your enquiry${svc ? ` about ${svc.name.toLowerCase()}` : ""} at SmileCare Dental Clinic.`;
    const next = svc
      ? `The first step is ${withArticle(svc.consultationType.toLowerCase())}, where the dentist examines and explains your options in person. ${TIME_Q}`
      : "Which treatment would you like to discuss? For example implants, aligners, braces, root canal treatment, whitening or a general check-up.";
    return `${opener} I'm the clinic's automated booking assistant and I can help you book a consultation or answer questions about timings, location and payments. ${next}`;
  };

  const offerBody = (slots: SlotRef[], lead = "") =>
    `${lead}These are the next open consultation times (${clinic.booking.consultationMinutes} minutes):\n${slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n")}\nTap a time or reply with the option number and I'll reserve it.`;

  const confirmBody = (lead: Lead, slot: SlotRef) => {
    const svc = demoServices.find((s) => s.id === lead.serviceId);
    return `You're booked for your ${(svc?.consultationType ?? "consultation").toLowerCase()} on ${slot.label} at SmileCare Dental Clinic, ${clinic.address}. We'll send a reminder the day before and 2 hours before. Reply here if you need to change the time.`;
  };

  const offerAround = (target: SlotRef, createdMs: number): SlotRef[] => {
    const t = new Date(target.start).getTime();
    const cands = [t - DAY, t, t + 2 * HOUR].filter((x) => x > createdMs + 3 * HOUR).map(slotAt);
    return cands.length >= 2 ? cands : [slotAt(t), slotAt(t + DAY)];
  };

  // ---------- Recent enquiries ----------
  RECENT.forEach((spec, i) => {
    const createdMs = "minutesAgo" in spec.when ? nowMs - spec.when.minutesAgo * MINUTE : atDaysAgo(spec.when[0], spec.when[1]);
    const id = `lead_${String(i + 1).padStart(3, "0")}`;
    const frs = 12 + Math.floor(rand() * 38);
    const assigned = pick(["usr_farhan", "usr_kavya", "usr_priya"]);
    const { lead, convo } = addLead({
      id,
      name: spec.name,
      phone: `+91 ${pick(["98", "97", "99", "96", "90", "88", "81", "70"])}${String(Math.floor(rand() * 1e3)).padStart(3, "0")} ${String(Math.floor(rand() * 1e5)).padStart(5, "0")}`,
      email: spec.source === "website" ? `${spec.name.split(" ")[0].toLowerCase()}.${spec.name.split(" ").pop()!.toLowerCase()}@example.com` : undefined,
      source: spec.source,
      serviceId: SID(spec.service),
      status: spec.status,
      createdAt: iso(createdMs),
      firstResponseSeconds: spec.status === "new" ? undefined : frs,
      assignedToId: assigned,
    });
    const first = spec.name.split(" ")[0];
    const svc = spec.service ? demoServices.find((s) => s.id === SID(spec.service)) : undefined;
    let t = createdMs;
    const replyMs = createdMs + frs * 1000;

    if (spec.source === "phone") {
      say(convo, lead, "system", t, `Missed call from ${lead.phone}. No voicemail left.`, { kind: "text" });
    } else {
      say(convo, lead, "patient", t, pick(ENQUIRY_TEXT[spec.service ?? "checkup"]));
    }

    if (spec.status === "new") {
      lead.intake.urgency = "routine";
      return;
    }

    lead.milestones.contactedAt = iso(replyMs);
    t = say(convo, lead, "ai", replyMs, greeting(lead), { meta: { intent: "greeting", provider: "demo-rules" } });

    switch (spec.script) {
      case "rahul": {
        const slot = takeFutureSlot(i, (h, wd) => h >= 17 && wd !== 0);
        const offered = [slotAt(new Date(slot.start).getTime() - DAY), slot, slotAt(new Date(slot.start).getTime() + DAY)].filter(
          (s) => new Date(s.start).getTime() > nowMs,
        );
        t = say(convo, lead, "patient", t + 4 * MINUTE, "Evenings are better, after 5. Also is there parking near the clinic?");
        lead.intake.preferredTime = "evening";
        lead.milestones.qualifiedAt = iso(t + 20_000);
        t = say(convo, lead, "ai", t + 20_000, offerBody(offered, "Yes. There's free parking for cars and two-wheelers in the Lakeview Arcade basement, and a lift to the 2nd floor.\n\n"), {
          kind: "slot_offer",
          slots: offered,
          meta: { intent: "faq", faqId: "faq_parking", provider: "demo-rules" },
        });
        t = say(convo, lead, "patient", t + 6 * MINUTE, "How much is the consultation?");
        t = say(convo, lead, "ai", t + 18_000, "The implant consultation is ₹500. Treatment costs depend on what the dentist finds during the consultation, so I can't quote them here. The team will explain costs and payment options before anything is started.", {
          meta: { intent: "price_question", provider: "demo-rules" },
        });
        t = say(convo, lead, "patient", t + 3 * MINUTE, `Ok, ${offered.indexOf(slot) + 1} works for me`);
        book(lead, convo, slot, t + 15_000, "ai", "scheduled");
        t = say(convo, lead, "ai", t + 15_000, confirmBody(lead, slot), { kind: "booking_confirmation", meta: { intent: "slot_choice", provider: "demo-rules" } });
        say(convo, lead, "system", t + 1000, "Appointment created. Reminders scheduled for 24 hours and 2 hours before.");
        lead.intake.isNewPatient = true;
        return;
      }
      case "arjun": {
        t = say(convo, lead, "patient", t + 9 * MINUTE, "My face is swollen on the right side since last night and the tooth pain is really bad. What should I do?");
        t = say(convo, lead, "ai", t + 8_000, `I can help with booking and general clinic information, but a dental professional should advise you about your symptoms. Please contact the clinic directly for urgent assistance. You can reach SmileCare Dental Clinic on ${clinic.phone}. ${clinic.emergencyInstructions}`, {
          kind: "escalation",
          meta: { intent: "emergency", guardrail: "inbound_emergency", provider: "guardrail" },
        });
        t = say(convo, lead, "system", t + 1000, "Escalated to the front desk: possible urgent dental problem. Assistant paused.");
        say(convo, lead, "staff", t + 11 * MINUTE, "Called Arjun, no answer. Trying again in 15 minutes. Dr. Meera informed.", { kind: "internal_note", authorId: "usr_farhan" });
        convo.mode = "human";
        convo.status = "needs_human";
        convo.unread = 1;
        lead.intake.urgency = "urgent";
        lead.assignedToId = "usr_farhan";
        return;
      }
      case "vikram": {
        t = say(convo, lead, "patient", t + 12 * MINUTE, "I'm 29 with a small gap in my front teeth. Which is better for me, braces or aligners?");
        t = say(convo, lead, "ai", t + 9_000, `I can help with booking and general clinic information, but a dental professional should advise you about your symptoms. Please contact the clinic directly for urgent assistance. You can reach SmileCare Dental Clinic on ${clinic.phone}. I've passed your question to our team so a dental professional can respond.`, {
          kind: "escalation",
          meta: { intent: "clinical_question", guardrail: "inbound_clinical", provider: "guardrail" },
        });
        say(convo, lead, "system", t + 1000, "Escalated to the front desk: patient asked a clinical question. Assistant paused.");
        convo.mode = "human";
        convo.status = "needs_human";
        convo.unread = 2;
        return;
      }
      case "ravi": {
        t = say(convo, lead, "patient", t + 25 * MINUTE, "Can I take amoxicillin till then? My friend said it helps.");
        t = say(convo, lead, "ai", t + 7_000, `I can help with booking and general clinic information, but a dental professional should advise you about your symptoms. Please contact the clinic directly for urgent assistance. You can reach SmileCare Dental Clinic on ${clinic.phone}. I've passed your question to our team so a dental professional can respond.`, {
          kind: "escalation",
          meta: { intent: "clinical_question", guardrail: "inbound_clinical", provider: "guardrail" },
        });
        t = say(convo, lead, "system", t + 1000, "Escalated to the front desk: patient asked a clinical question. Assistant paused.");
        t = say(convo, lead, "system", t + 14 * MINUTE, "Priya Nair took over the conversation.");
        t = say(convo, lead, "staff", t + 60_000, "Hi Ravi, this is Priya from SmileCare. Dr. Meera will call you at 6 pm today to talk this through. Please don't start any medicine before speaking with her.", { authorId: "usr_priya" });
        say(convo, lead, "staff", t + 30_000, "Dr. Meera to call at 6 pm. Book RCT consult after the call.", { kind: "internal_note", authorId: "usr_priya" });
        convo.mode = "human";
        convo.takenOverById = "usr_priya";
        convo.status = "needs_human";
        lead.assignedToId = "usr_priya";
        lead.intake.urgency = "soon";
        return;
      }
      case "fatima": {
        const slot = takeFutureSlot(i, (_h, wd) => wd === 6);
        t = say(convo, lead, "patient", t + 5 * MINUTE, "Salaam. It's for my daughter, she is 12. Can I come with her on a Saturday?");
        lead.intake.preferredTime = "weekend";
        const offered = [slot, slotAt(new Date(slot.start).getTime() + HOUR)];
        lead.milestones.qualifiedAt = iso(t + 15_000);
        t = say(convo, lead, "ai", t + 15_000, offerBody(offered), { kind: "slot_offer", slots: offered, meta: { intent: "time_preference", provider: "demo-rules" } });
        t = say(convo, lead, "patient", t + 7 * MINUTE, "Can the doctor also check my son on the same day? He is 8.");
        t = say(convo, lead, "ai", t + 12_000, `Of course. I've asked the front desk team to take over this conversation. ${clinic.escalationInstructions}`, {
          meta: { intent: "human_request", provider: "demo-rules" },
        });
        t = say(convo, lead, "system", t + 1000, "Handed to front desk: family booking for two children.");
        t = say(convo, lead, "system", t + 9 * MINUTE, "Priya Nair took over the conversation.");
        book(lead, convo, slot, t + 2 * MINUTE, "staff", "confirmed");
        t = say(convo, lead, "staff", t + 2 * MINUTE, `Hi Fatima, Priya here. I've booked Zara for the orthodontic consultation on ${slot.label}, and a check-up for Ayaan straight after. See you then!`, {
          kind: "booking_confirmation",
          authorId: "usr_priya",
        });
        t = say(convo, lead, "system", t + 1000, "Appointment created by Priya Nair. Reminders scheduled for 24 hours and 2 hours before.");
        say(convo, lead, "system", t + 60_000, "Priya Nair returned the conversation to the assistant.");
        lead.assignedToId = "usr_priya";
        return;
      }
      case "sneha": {
        t = say(convo, lead, "patient", t + 6 * MINUTE, "Do you have EMI options?");
        t = say(convo, lead, "ai", t + 14_000, `We accept UPI, debit and credit cards, and cash. For treatments above ₹20,000 we offer no-cost EMI through our finance partner, subject to their approval.\n\nWould you like me to find you a consultation time? ${TIME_Q}`, {
          meta: { intent: "faq", faqId: "faq_payment", provider: "demo-rules" },
        });
        t = say(convo, lead, "patient", t + 11 * MINUTE, "Weekends only, I work weekdays.");
        lead.intake.preferredTime = "weekend";
        const offered = [takeFutureSlot(i, (_h, wd) => wd === 6), takeFutureSlot(i + 1, (_h, wd) => wd === 0), takeFutureSlot(i + 2, (_h, wd) => wd === 6)].sort((a, b) =>
          a.start.localeCompare(b.start),
        );
        offered.forEach((s) => usedStarts.delete(s.start));
        lead.milestones.qualifiedAt = iso(t + 16_000);
        t = say(convo, lead, "ai", t + 16_000, offerBody(offered), { kind: "slot_offer", slots: offered, meta: { intent: "time_preference", provider: "demo-rules" } });
        followUp(lead, "no_reply_nudge", t + 24 * HOUR, `Hi ${first}, just checking whether one of those weekend times works for your aligner assessment. Reply with the option number and I'll reserve it.`);
        return;
      }
    }

    // ---------- Templated conversations by status ----------
    const late = createdMs < nowMs - 30 * HOUR;
    if (spec.status === "contacted") {
      if (late) {
        const nudgeMs = createdMs + 24 * HOUR;
        say(convo, lead, "ai", nudgeMs, `Hi ${first}, just following up on your ${svc?.name.toLowerCase() ?? "dental"} enquiry. Would you like me to find a consultation time? Reply with a day that suits you.`, {
          kind: "reminder",
          meta: { intent: "no_reply_nudge", provider: "demo-rules" },
        });
        followUp(lead, "no_reply_nudge", nudgeMs, "First no-reply nudge");
        followUp(lead, "no_reply_nudge", nudgeMs + 72 * HOUR, `Hi ${first}, we still have consultation times this week if you'd like one. Reply here any time.`);
      } else {
        followUp(lead, "no_reply_nudge", createdMs + 24 * HOUR, `Hi ${first}, just following up on your ${svc?.name.toLowerCase() ?? "dental"} enquiry. Would you like me to find a consultation time?`);
      }
      return;
    }

    if (spec.status === "do_not_contact") {
      t = say(convo, lead, "patient", t + 40 * MINUTE, "Please stop messaging me.");
      say(convo, lead, "ai", t + 6_000, `Understood. You won't receive any more messages from SmileCare Dental Clinic. If you ever need us, you can message this number or call ${clinic.phone}.`, {
        meta: { intent: "opt_out", guardrail: "inbound_opt_out", provider: "guardrail" },
      });
      lead.consentToContact = false;
      convo.status = "closed";
      return;
    }

    if (spec.status === "lost") {
      if (rand() < 0.5) {
        t = say(convo, lead, "patient", t + 3 * HOUR, "Thanks, but I've booked somewhere closer to home.");
        say(convo, lead, "ai", t + 9_000, `No problem, ${first}. Thanks for letting us know. If you'd like to book in future, just message us here.`, {
          meta: { intent: "not_interested", provider: "demo-rules" },
        });
        lead.lostReason = "Booked elsewhere";
      } else {
        const n1 = createdMs + 24 * HOUR;
        say(convo, lead, "ai", n1, `Hi ${first}, just following up on your ${svc?.name.toLowerCase()} enquiry. Would you like me to find a consultation time?`, { kind: "reminder" });
        say(convo, lead, "ai", n1 + 72 * HOUR, `Hi ${first}, we still have consultation times this week if you'd like one. Reply here any time.`, { kind: "reminder" });
        say(convo, lead, "system", n1 + 7 * DAY, "No reply after two follow-ups. Marked lost.");
        followUp(lead, "no_reply_nudge", n1, "First no-reply nudge");
        followUp(lead, "no_reply_nudge", n1 + 72 * HOUR, "Second no-reply nudge");
        lead.lostReason = "No reply";
      }
      convo.status = "closed";
      return;
    }

    // qualified / booked / attended share the qualification exchange.
    const pref = pick(PREF_TEXT);
    t = say(convo, lead, "patient", t + (8 + Math.floor(rand() * 60)) * MINUTE, pref);
    lead.intake.preferredTime = /evening/i.test(pref) ? "evening" : /morning/i.test(pref) ? "morning" : /saturday/i.test(pref) ? "weekend" : /afternoon/i.test(pref) ? "afternoon" : "any";
    lead.milestones.qualifiedAt = iso(t + 15_000);

    if (spec.status === "qualified") {
      const offered = [takeFutureSlot(i), takeFutureSlot(i + 3), takeFutureSlot(i + 5)].sort((a, b) => a.start.localeCompare(b.start));
      offered.forEach((s) => usedStarts.delete(s.start));
      t = say(convo, lead, "ai", t + 15_000, offerBody(offered), { kind: "slot_offer", slots: offered, meta: { intent: "time_preference", provider: "demo-rules" } });
      followUp(lead, "no_reply_nudge", Math.max(t + 24 * HOUR, nowMs + 3 * HOUR), `Hi ${first}, would one of those times work for your ${svc?.consultationType.toLowerCase()}? Reply with the option number and I'll reserve it.`);
      return;
    }

    if (spec.status === "booked") {
      const slot = takeFutureSlot(i);
      const offered = offerAround(slot, t).filter((s) => new Date(s.start).getTime() > nowMs || s.start === slot.start);
      if (!offered.some((s) => s.start === slot.start)) offered.push(slot);
      offered.sort((a, b) => a.start.localeCompare(b.start));
      t = say(convo, lead, "ai", t + 15_000, offerBody(offered), { kind: "slot_offer", slots: offered, meta: { intent: "time_preference", provider: "demo-rules" } });
      t = say(convo, lead, "patient", t + (2 + Math.floor(rand() * 20)) * MINUTE, `${offered.findIndex((s) => s.start === slot.start) + 1}`);
      book(lead, convo, slot, t + 10_000, "ai", rand() < 0.5 ? "confirmed" : "scheduled");
      t = say(convo, lead, "ai", t + 10_000, confirmBody(lead, slot), { kind: "booking_confirmation", meta: { intent: "slot_choice", provider: "demo-rules" } });
      say(convo, lead, "system", t + 1000, "Appointment created. Reminders scheduled for 24 hours and 2 hours before.");
      return;
    }

    // attended: appointment 2 to 6 days after enquiry, in the past.
    const apptDay = Math.max(1, Math.min(spec.when instanceof Array ? spec.when[0] - 1 : 1, 2 + Math.floor(rand() * 5)));
    const enquiryDaysAgo = spec.when instanceof Array ? spec.when[0] : 0;
    const apptMs = atDaysAgo(Math.max(1, enquiryDaysAgo - apptDay), pick(["10:00", "11:30", "12:00", "15:00", "16:30", "17:30", "18:00"]));
    const slot = slotAt(apptMs);
    const offered = offerAround(slot, t);
    if (!offered.some((s) => s.start === slot.start)) offered.push(slot);
    offered.sort((a, b) => a.start.localeCompare(b.start));
    t = say(convo, lead, "ai", t + 15_000, offerBody(offered), { kind: "slot_offer", slots: offered, meta: { intent: "time_preference", provider: "demo-rules" } });
    t = say(convo, lead, "patient", t + 6 * MINUTE, `${offered.findIndex((s) => s.start === slot.start) + 1}`);
    const appt = book(lead, convo, slot, t + 10_000, "ai", "attended");
    t = say(convo, lead, "ai", t + 10_000, confirmBody(lead, slot), { kind: "booking_confirmation", meta: { intent: "slot_choice", provider: "demo-rules" } });
    say(convo, lead, "system", t + 1000, "Appointment created. Reminders scheduled for 24 hours and 2 hours before.");
    say(convo, lead, "system", apptMs + 45 * MINUTE, `Marked attended by ${pick(["Farhan Sheikh", "Kavya Reddy", "Priya Nair"])}.`);
    lead.milestones.attendedAt = iso(apptMs + 45 * MINUTE);
    const post = apptMs + 26 * HOUR;
    say(convo, lead, "ai", post, `Hi ${first}, thank you for visiting SmileCare yesterday. If you have questions about your next steps, reply here and the team will help.`, {
      kind: "reminder",
      meta: { intent: "post_consult_check", provider: "demo-rules" },
    });
    followUp(lead, "post_consult_check", post, "Post-consultation check-in", appt.id);
  });

  // ---------- Dormant enquiries (eligible for reactivation) ----------
  const dormantBase = leads.length;
  DORMANT.forEach((d, i) => {
    const createdMs = atDaysAgo(d.daysAgo, pick(["10:15", "13:40", "18:25", "21:10", "22:45"]));
    const id = `lead_${String(dormantBase + i + 1).padStart(3, "0")}`;
    const { lead, convo } = addLead({
      id,
      name: d.name,
      phone: `+91 ${pick(["98", "97", "99", "94", "80", "88"])}${String(Math.floor(rand() * 1e3)).padStart(3, "0")} ${String(Math.floor(rand() * 1e5)).padStart(5, "0")}`,
      source: d.source,
      serviceId: SID(d.service),
      status: d.status,
      createdAt: iso(createdMs),
      firstResponseSeconds: 15 + Math.floor(rand() * 40),
    });
    say(convo, lead, "patient", createdMs, pick(ENQUIRY_TEXT[d.service]));
    lead.milestones.contactedAt = iso(createdMs + 30_000);
    say(convo, lead, "ai", createdMs + 30_000, greeting(lead), { meta: { intent: "greeting", provider: "demo-rules" } });
    say(convo, lead, "ai", createdMs + 24 * HOUR, `Hi ${d.name.split(" ")[0]}, just following up on your enquiry. Would you like me to find a consultation time?`, { kind: "reminder" });
    if (d.status === "lost") {
      say(convo, lead, "system", createdMs + 8 * DAY, "No reply after follow-ups. Marked lost.");
      lead.lostReason = "No reply";
    }
    convo.status = "closed";
  });

  // ---------- Completed reactivation campaign ----------
  const campaignLaunched = atDaysAgo(21, "11:00");
  const campaigns: Campaign[] = [
    {
      id: "cmp_q2_implants_aligners",
      clinicId: DEMO_CLINIC_ID,
      name: "Unbooked implant and aligner enquiries",
      status: "completed",
      channel: "whatsapp",
      audience: { minDaysSinceActivity: 60, maxDaysSinceActivity: 240, statuses: ["contacted", "lost"], serviceIds: ["svc_implants", "svc_aligners"] },
      message:
        "Hi {first_name}, you enquired about {service} at {clinic_name} a while ago. Would you still like to book a consultation? Reply YES and I'll share available times, or STOP to opt out.",
      createdAt: iso(campaignLaunched - 2 * DAY),
      launchedAt: iso(campaignLaunched),
    },
    {
      id: "cmp_draft_cosmetic",
      clinicId: DEMO_CLINIC_ID,
      name: "Whitening and veneers enquiries, last 6 months",
      status: "draft",
      channel: "whatsapp",
      audience: { minDaysSinceActivity: 45, maxDaysSinceActivity: 180, statuses: ["contacted", "lost"], serviceIds: ["svc_whitening", "svc_veneers"] },
      message:
        "Hi {first_name}, you asked us about {service} at {clinic_name}. We have consultation times this week if you'd still like one. Reply YES for times, or STOP to opt out.",
      createdAt: iso(nowMs - 2 * DAY),
    },
  ];
  const recipients: CampaignRecipient[] = [];
  const campaignBase = leads.length;
  CAMPAIGN_POOL.forEach((c, i) => {
    const createdMs = atDaysAgo(c.daysAgo, pick(["11:20", "15:05", "19:45", "20:30"]));
    const id = `lead_${String(campaignBase + i + 1).padStart(3, "0")}`;
    const { lead, convo } = addLead({
      id,
      name: c.name,
      phone: `+91 ${pick(["98", "97", "99", "94", "80", "88"])}${String(Math.floor(rand() * 1e3)).padStart(3, "0")} ${String(Math.floor(rand() * 1e5)).padStart(5, "0")}`,
      source: c.source,
      serviceId: SID(c.service),
      status: "lost",
      createdAt: iso(createdMs),
      firstResponseSeconds: 15 + Math.floor(rand() * 40),
      lostReason: "No reply",
    });
    const first = c.name.split(" ")[0];
    const svc = demoServices.find((s) => s.id === lead.serviceId)!;
    say(convo, lead, "patient", createdMs, pick(ENQUIRY_TEXT[c.service]));
    lead.milestones.contactedAt = iso(createdMs + 25_000);
    say(convo, lead, "ai", createdMs + 25_000, greeting(lead), { meta: { intent: "greeting", provider: "demo-rules" } });
    say(convo, lead, "system", createdMs + 8 * DAY, "No reply after follow-ups. Marked lost.");
    const sentMs = campaignLaunched + i * 40_000;
    say(convo, lead, "ai", sentMs, `Hi ${first}, you enquired about ${svc.name.toLowerCase()} at SmileCare Dental Clinic a while ago. Would you still like to book a consultation? Reply YES and I'll share available times, or STOP to opt out.`, {
      kind: "reminder",
      meta: { intent: "reactivation", provider: "demo-rules" },
    });
    const rec: CampaignRecipient = {
      id: `rcp_${String(i + 1).padStart(3, "0")}`,
      clinicId: DEMO_CLINIC_ID,
      campaignId: "cmp_q2_implants_aligners",
      leadId: lead.id,
      status: c.outcome,
      sentAt: iso(sentMs),
    };
    // "Reactivated" means re-engaged: the lead asked for times or booked. Opt-outs and "got it done elsewhere" are replies, not reactivations.
    lead.reactivatedFromCampaignId = c.outcome === "booked" || c.outcome === "interested" ? "cmp_q2_implants_aligners" : undefined;
    followUps.push({
      id: `fu_${String(++fuSeq).padStart(3, "0")}`,
      clinicId: DEMO_CLINIC_ID,
      leadId: lead.id,
      kind: "reactivation",
      channel: "whatsapp",
      dueAt: iso(sentMs),
      status: "sent",
      body: "Reactivation message",
    });
    if (c.reply) {
      const rMs = sentMs + (40 + Math.floor(rand() * 300)) * MINUTE;
      rec.repliedAt = iso(rMs);
      rec.reply = c.reply;
      say(convo, lead, "patient", rMs, c.reply);
      if (c.outcome === "booked") {
        const isFirst = i === 0;
        const apptMs = isFirst ? atDaysAgo(14, "18:00") : 0;
        const slot = isFirst ? slotAt(apptMs) : takeFutureSlot(i + 11, (_h, wd) => wd === 6 || wd === 0);
        const offered = isFirst ? [slotAt(apptMs - DAY), slot] : [slot, slotAt(new Date(slot.start).getTime() + HOUR)];
        lead.milestones.qualifiedAt = iso(rMs + 12_000);
        say(convo, lead, "ai", rMs + 12_000, offerBody(offered, "Great to hear from you. "), { kind: "slot_offer", slots: offered, meta: { intent: "booking_request", provider: "demo-rules" } });
        say(convo, lead, "patient", rMs + 9 * MINUTE, isFirst ? "2" : "1");
        book(lead, convo, slot, rMs + 9 * MINUTE + 10_000, "ai", isFirst ? "attended" : "confirmed");
        say(convo, lead, "ai", rMs + 9 * MINUTE + 10_000, confirmBody(lead, slot), { kind: "booking_confirmation" });
        say(convo, lead, "system", rMs + 9 * MINUTE + 11_000, "Appointment created from reactivation campaign. Reminders scheduled.");
        lead.status = isFirst ? "attended" : "booked";
        if (isFirst) lead.milestones.attendedAt = iso(apptMs + 40 * MINUTE);
        convo.status = "open";
      } else if (c.outcome === "interested") {
        const offered = [takeFutureSlot(i + 2), takeFutureSlot(i + 4)].sort((a, b) => a.start.localeCompare(b.start));
        offered.forEach((s) => usedStarts.delete(s.start));
        lead.milestones.qualifiedAt = iso(rMs + 12_000);
        say(convo, lead, "ai", rMs + 12_000, offerBody(offered, "Thanks for getting back to us. "), { kind: "slot_offer", slots: offered });
        lead.status = "qualified";
        convo.status = "open";
      } else if (c.outcome === "needs_human") {
        say(convo, lead, "ai", rMs + 8_000, `I can help with booking and general clinic information, but a dental professional should advise you about your symptoms. Please contact the clinic directly for urgent assistance. You can reach SmileCare Dental Clinic on ${clinic.phone}. I've passed your question to our team so a dental professional can respond.`, {
          kind: "escalation",
          meta: { guardrail: "inbound_clinical", provider: "guardrail" },
        });
        say(convo, lead, "system", rMs + 9_000, "Escalated to the front desk. Assistant paused.");
        lead.status = "needs_human";
        convo.mode = "human";
        convo.status = "needs_human";
      } else if (c.outcome === "unsubscribed") {
        say(convo, lead, "ai", rMs + 6_000, `Understood. You won't receive any more messages from SmileCare Dental Clinic. If you ever need us, you can message this number or call ${clinic.phone}.`, {
          meta: { guardrail: "inbound_opt_out", provider: "guardrail" },
        });
        lead.status = "do_not_contact";
        lead.consentToContact = false;
      } else if (c.outcome === "replied") {
        say(convo, lead, "ai", rMs + 7_000, `No problem, ${first}. Thanks for letting us know. If you'd like to book in future, just message us here.`);
      }
    }
    recipients.push(rec);
  });

  // ---------- Existing diary (patients booked outside ConsultFlow) ----------
  const busyBlocks: BusyBlock[] = [];
  const taken = new Set(appointments.map((a) => a.start));
  const grid = listOpenSlots({ rules: clinic.booking, timeZone: tz, appointments: [], now: new Date(nowMs - 3 * HOUR) });
  for (const s of grid) {
    if (taken.has(s.start)) continue;
    if (rand() < 0.58) busyBlocks.push({ start: s.start, end: s.end, label: "Existing patient" });
  }

  return {
    version: DEMO_DATA_VERSION,
    seededAt: iso(nowMs),
    clinic,
    roi: { treatmentAcceptance: 0.45, defaultConsultationFee: 400 },
    busyBlocks,
    services: structuredClone(demoServices),
    faqs: structuredClone(demoFaqs),
    staff: structuredClone(demoStaff),
    leads,
    conversations,
    messages: messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    appointments,
    followUps,
    campaigns,
    recipients,
    events: leads.map((l, i) => ({ id: `evt_${i + 1}`, clinicId: DEMO_CLINIC_ID, type: "lead_created" as const, leadId: l.id, at: l.createdAt })),
  };
}
