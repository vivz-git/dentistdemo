# ConsultFlow Dental

**Convert more enquiries into consultations without adding another receptionist.**

ConsultFlow is a conversion layer for private dental clinics. It replies to new enquiries in seconds, answers the clinic's own non-clinical FAQs, finds out what the patient wants, offers real open consultation times, books them, schedules reminders and follow-ups, recovers old enquiries through reactivation campaigns, and shows the clinic its conversion funnel. Staff can take over any conversation at any time.

This repository is a **sales-ready MVP running in demo mode** with a fictional clinic, *SmileCare Dental Clinic* (Bengaluru), and a month of synthetic enquiries. It is **not** a production healthcare system and must not be used with real patient data (see [Production Healthcare Readiness](#production-healthcare-readiness)).

---

## Run it locally

Requirements: Node.js 20.9+ (tested on Node 22) and npm.

```bash
git clone https://github.com/vivz-git/dentistdemo.git
cd dentistdemo
git checkout claude/consultflow-mvp   # until merged into main
npm install
npm run dev
```

Open http://localhost:3000, click **View Live Demo**, then **Continue to the demo**.

No API keys are needed. Optional settings live in `.env.example` (copy to `.env.local`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server on port 3000 |
| `npm run build` | Production build (type-checks as part of the build) |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Vitest unit and workflow tests (14 tests) |

## First three things to test

1. **A lead converts in under a minute.** On the dashboard press **Simulate new enquiry**. You land in the conversation: the assistant replies within about a second. Tap the suggested patient reply *"Evenings work best for me"*, then tap one of the offered times. The lead becomes **Booked**, a confirmation and reminder schedule appear, and the dashboard's *New enquiries today* and *Booked consultations* both go up by one.
2. **The assistant knows its limits.** Simulate another enquiry and tap *"Is my bleeding gum serious? What should I take?"*. The assistant sends the fixed safety message, pauses itself and hands the chat to the front desk (**Needs Human**). Use **Take Over**, send a staff message, then **Return to AI**.
3. **Old leads come back.** Open **Reactivation**, review the draft campaign (audience, message, live preview, opt-out count) and press **Review and launch → Launch campaign**. Over the next few seconds simulated replies arrive: some book, some ask a question, one says STOP and is opted out. The recovered consultations show on the campaign card, the dashboard and analytics.

Also worth a look: **Clinic settings → Knowledge base → Test the assistant**, where you can ask anything and see exactly what a patient would receive.

**Reset demo data** (sidebar) restores the original dataset at any time. The data also refreshes itself if it's more than 24 hours old, so "today" always has activity.

---

## What is functional

- **Landing page**: problem, how it works, funnel, reactivation, human handoff and guardrails, interactive ROI calculator (clearly labelled estimates), pricing placeholder, working *Book a Demo* form (validated server-side, logged, not emailed).
- **Demo authentication**: `/login` issues an httpOnly session cookie; `src/proxy.ts` gates `/app/*`; sign-out clears it.
- **Dashboard**: new enquiries today, response rate and median first-reply time, booked consultations, booking conversion, pending follow-ups, reactivated leads, missed opportunities, a live five-stage funnel, a needs-attention queue, latest activity and upcoming consultations. Every number is computed from the data, so actions update it immediately.
- **Lead inbox**: 82 synthetic leads with name, phone, email, source, service interest, status, created, last activity, assigned staff and appointment status. Filter by status (all eight statuses plus *Needs attention*), source, service and free-text search.
- **Conversation view**: patient, assistant, staff and system messages, each labelled in text; tappable slot offers; booking confirmations; escalations; internal notes; typing indicator; **Take Over** / **Return to AI**; a *Reply as patient (demo)* control with suggested replies to drive the scenario; missed-call follow-up; lead details panel to change status, service and assignee, book or reschedule for the patient, mark attended or no-show, and see every scheduled or sent follow-up and guardrail event.
- **Assistant pipeline** (`src/lib/ai`): deterministic intent handling for greetings, FAQs, price questions, service interest, time preference, slot choice (by number, label, weekday or time), not-interested, human requests and opt-outs. Inbound guardrails handle emergencies, clinical questions and opt-outs *before* any model is called; output guardrails reject replies that quote unconfigured prices, claim unconfirmed bookings, offer unavailable times or give medical advice.
- **Booking**: availability computed from working hours, lunch breaks, minimum notice, booking window, blackout dates, existing diary entries and booked appointments. Double-booking is refused. Booking sets status, creates the appointment and schedules 24-hour and 2-hour reminders; no-reply nudges are scheduled and cancelled automatically.
- **Appointments**: upcoming and past consultations by day, reminder state, attended / no-show marking, booking rules summary and open-slot count.
- **Reactivation center**: old and eligible lead counts, drafts, active campaigns, replies, recovered consultations and conversion rate; a campaign builder (audience by status, service and days since activity; message with merge fields; opt-out requirement; live preview); simulated launch with staged replies; per-campaign outcome bars and reply list; automatic exclusion of opted-out and previously messaged leads.
- **Analytics**: 7 / 30 / 90-day periods; enquiries, median response time, contacted, qualified, booked, attended, lost, reactivated percentages, recovered consultations; daily enquiries vs bookings chart with hover tooltips; breakdowns by source and service; estimated consultation fees and treatment opportunity with an editable acceptance assumption; a per-100-enquiries ROI panel. All labelled *Demo data* / *Estimate*.
- **Clinic settings**: profile, payment methods, parking, working hours and breaks, booking rules, blackout dates, reminder toggles, services and consultation types (fee quoted or not), knowledge-base editor with an assistant tester, escalation wording, staff users and roles, integration status.
- **Responsive** from 390 px phones to wide desktops; verified with no horizontal overflow on mobile.

## What is simulated

- **All data** is synthetic and lives in the visitor's browser (`localStorage`), so every prospect gets their own sandbox.
- **No message is ever sent.** WhatsApp, SMS and email go through `SimulatedMessaging`.
- **Patient replies** in the conversation view are typed or tapped by you (*Reply as patient (demo)*). Reactivation replies are scripted.
- **The diary**: existing patients are represented by synthetic busy blocks rather than a real calendar or PMS.
- **The assistant** is a deterministic rules engine unless you enable Claude (below). Both run through the same guardrails.
- **Authentication** is a one-click demo session with no password.

## Remaining production integrations

| Integration | Status | What's needed |
|---|---|---|
| WhatsApp Business Cloud API | Interface only (`MessagingProvider`) | Verified business number, approved templates, webhook for inbound messages and delivery receipts |
| SMS (India) | Interface only | Provider account, DLT-registered sender ID and templates |
| Email | Interface only | Provider account and verified sending domain |
| Calendar / practice-management system | Internal demo booking (`BookingProvider`) | PMS or calendar API adapter, two-way sync, conflict handling |
| Database | Schema written (`supabase/migrations`) | Supabase project, server-side repository replacing the browser store, scheduled job to send due follow-ups |
| Authentication | Demo cookie | Supabase Auth / Clerk / Auth.js with email OTP, roles enforced server-side |
| LLM | Claude provider implemented, off by default | API key, prompt evaluation on real (consented) conversations |
| Lead capture | Simulated | Website form embed, Google Business / Instagram / directory lead webhooks, missed-call webhook from the clinic's telephony |
| Demo request form | Logs server-side | CRM or email notification |

## Enable the Claude assistant (optional)

The assistant runs server-side at `POST /api/assistant`. To use Claude instead of the rules engine:

```bash
# .env.local
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
# optional: ANTHROPIC_MODEL=claude-opus-5-5
```

`src/lib/ai/providers/anthropic.ts` builds a system prompt only from clinic configuration (details, hours, services, configured fees, FAQs, escalation rules), asks for a structured JSON reply (intent, service, time preference, whether to offer slots, which offered slot was chosen, whether to escalate), and never lets the model write appointment times: slots are always attached by the booking engine. It enables server-side refusal fallbacks and prompt caching of the clinic prompt. If the model errors, times out, or its reply fails an output guardrail, the deterministic reply is used instead. The key never reaches the browser; `GET /api/assistant` reports which provider is active, and **Clinic settings → Integrations** shows it.

---

## Architecture

```
src/
  app/
    page.tsx                 Landing page
    login/                   Demo sign-in
    app/                     Clinic app: dashboard, inbox, inbox/[leadId], appointments,
                             reactivation, analytics, settings
    api/assistant/           Assistant turn (server-side provider selection)
    api/auth/demo/           Demo session cookie
    api/demo-request/        Landing page form
  proxy.ts                   Session gate for /app (Next.js 16 "proxy", formerly middleware)
  components/                UI (landing, app, primitives)
  lib/
    domain/                  Entity types and labels (clinic_id on every tenant entity)
    demo/                    SmileCare clinic config and the synthetic data generator
    ai/                      Context builder, prompt, guardrails, pipeline, providers
    booking/                 Availability engine
    integrations/            MessagingProvider and BookingProvider interfaces
    store/                   Pure workflow actions + zustand store (demo persistence)
    analytics/               Funnel, KPI, revenue and ROI calculations
supabase/migrations/         Production Postgres schema with row level security
tests/                       Vitest workflow tests
```

**How a turn works.** The browser builds an `AssistantContext` (clinic knowledge, recent transcript, open slots, last offer) and posts it to `/api/assistant`. The server runs `runAssistant`: inbound guardrail → provider → output guardrail. The reply comes back with *actions* (`offer_slots`, `book_slot`, `escalate`, `opt_out`, `set_service`, …) which `applyAssistantReply` in `src/lib/store/actions.ts` executes against the data. Those actions are pure functions over `ClinicData`, the same shape as the database tables, so moving them server-side against Postgres is a repository swap rather than a rewrite. If the API is unreachable the same pipeline runs in the browser with the deterministic provider.

**Stack.** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS 4, zustand, Phosphor icons, Anthropic TypeScript SDK (optional), Vitest.

**Localisation.** Times are stored in UTC and rendered in the clinic's IANA timezone; currency, locale and phone formats live on the clinic record. Nothing in the booking or assistant logic assumes India, so AU / UK / US clinics are a configuration change plus copy review. International features are not built in V1.

## Deploy

### Vercel (recommended)

1. Push the branch to GitHub (already done for `claude/consultflow-mvp`).
2. In Vercel: **Add New → Project**, import `vivz-git/dentistdemo`, choose the branch (or merge to `main` first).
3. Framework preset: **Next.js**. Build command `npm run build`, output left as default.
4. Environment variables: none are required. Optionally add `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` (as a server-side variable, never `NEXT_PUBLIC_`).
5. Deploy. The landing page is at `/`, the demo at `/login`.

### Any Node host

```bash
npm ci
npm run build
PORT=3000 npm start
```

Demo state is per browser, so the app scales horizontally with no shared storage. Put it behind HTTPS so the session cookie is marked `secure`.

## Testing

`npm test` runs the workflow tests in `tests/flow.test.ts`:

- the seed produces a realistic clinic (all eight statuses, funnel monotonic, no double bookings)
- availability respects hours, breaks, notice and blackouts
- risky messages are classified correctly; clinical questions are escalated with the approved wording and never reach the provider
- invented prices, confirmations and medical advice are rejected
- a new enquiry moves through contacted → qualified → booked, reminders are scheduled and the dashboard counts it
- taken slots cannot be booked; takeover and return to AI; opt-out; reactivation eligibility and re-opening lost leads
- polite close when the patient booked elsewhere; tapping an offered time books exactly that time

The full browser journey (landing → login → simulate → qualify → book → dashboard update, escalation, takeover, reactivation, knowledge-base tester, mobile layout) was also run against the production build with Playwright and Chromium, with no console errors.

## Production Healthcare Readiness

This MVP is a demonstration. **Before any real patient data is used**, the following must be reviewed with qualified legal, privacy, security and clinical advisers:

- **Applicable law and regulation.** In India, the Digital Personal Data Protection Act 2023 and its rules, plus any state or professional requirements for dental practices; for later markets, the Australian Privacy Act / APPs, UK GDPR and Data Protection Act 2018, and HIPAA (and state laws) in the US. Health information is sensitive data in all of them.
- **Consent.** Record lawful basis and consent for every contact channel (and its source), especially WhatsApp marketing and reactivation. Honour opt-outs across all channels immediately and permanently. Follow WhatsApp Business policy and India's TRAI/DLT rules for SMS.
- **Data minimisation.** Collect only booking information. Discourage patients from sending clinical details in chat, and restrict who can read conversations that contain them.
- **Retention and deletion.** Define retention periods for leads, conversations and analytics; support patient access, correction and deletion requests; purge demo data separately (`is_demo` flag on clinics, `demo` flag on seeded records).
- **Security.** Server-side authentication with MFA for clinic users, row level security (provided in the schema) verified by tests, encryption in transit and at rest, audit logging of staff access and takeovers, secrets only in server environment variables, dependency and penetration testing, and data residency decisions.
- **Processors.** Data processing agreements with every sub-processor (hosting, database, messaging providers, LLM provider), including whether the LLM provider retains or trains on data.
- **Clinical safety.** The assistant must remain non-clinical. Review the escalation wording, emergency guidance and guardrail patterns with the clinic's dentists; keep a human reachable during clinic hours; monitor escalations and guardrail events; evaluate any LLM against real (consented, de-identified) conversations before enabling it.
- **Accuracy of claims.** Revenue figures are estimates from clinic-supplied assumptions. Do not present demo or estimated figures as customer results.

## Design

The interface follows a "status board" system: a cool paper ground, blue-black board panels, one signal yellow reserved for live state and the primary action, and reserved status colours that are always paired with a text label. Typography is a single family (Archivo) using its width axis for condensed board lettering. Design decisions are recorded in `DESIGN.md` and `PRODUCT.md`. Built with the [impeccable](https://github.com/pbakaus/impeccable) and [taste-skill](https://github.com/Leonxlnx/taste-skill) design skills.
