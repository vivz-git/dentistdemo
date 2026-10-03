ConsultFlow Dental

Turn dental enquiries into booked consultations — without adding another receptionist.

ConsultFlow is a demo conversion workflow for private dental clinics. It handles new enquiries, answers non-clinical FAQs, qualifies patients, offers available slots, books consultations, schedules reminders, and reactivates old leads.

Demo only: uses synthetic data and simulated messaging. Do not use with real patient data.

What it does

Lead → booking: enquiry, qualification, slot selection, booking and reminders

Human handoff: clinical questions, emergencies and sensitive cases are escalated to staff

Lead reactivation: bring eligible old enquiries back into the funnel

Analytics: funnel, response time, bookings, reactivation and estimated ROI

Guardrails: the AI cannot invent prices, availability, bookings or medical advice

Demo data: 82 synthetic leads with a realistic clinic workflow

Architecture

flowchart LR
    A[New enquiry] --> B[Assistant]
    B --> C{Guardrails}
    C -->|Safe| D[Qualify lead]
    D --> E[Booking engine]
    E --> F[Available slot]
    F --> G[Book + reminders]
    G --> H[Analytics]

    C -->|Clinical / emergency / human request| I[Staff takeover]
    I --> H

    J[Old leads] --> K[Reactivation]
    K --> G

The assistant handles conversation; business logic controls availability, booking and safety.

Run locally

Requirements: Node.js 20.9+ and npm.

git clone https://github.com/vivz-git/dentistdemo.git
cd dentistdemo
npm install
npm run dev

Open http://localhost:3000.

No API keys are required for the default demo.

Optional: Groq

Set:

AI_PROVIDER=groq
GROQ_API_KEY=your_key

The Groq provider is server-side and uses the same guardrails. The model does not control appointment availability.

Test the demo

Simulate new enquiry → qualify → choose a slot → book

Ask a clinical question → watch it hand off to staff

Open Reactivation → launch a demo campaign → see recovered consultations

Tech

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Zustand · Zod · Vitest · Groq (optional)

Testing

npm test

The test suite covers booking rules, guardrails, escalation, opt-outs, reactivation and assistant fallbacks.

Production status

This is a sales-ready MVP / demo, not a production healthcare system.

Before using real patient data, production integrations, authentication, consent, security, privacy, compliance and clinical review still need to be implemented and validated.
