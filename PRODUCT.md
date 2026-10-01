# Product

<!-- impeccable:product-schema 1 -->

> Inferred from the founder's written brief. The interview round was skipped because the founder asked for autonomous execution with no question rounds. Items marked *(inferred)* are assumptions to confirm.

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS v4. Demo mode runs on an in-memory/local store seeded with synthetic data; the data layer is shaped for PostgreSQL (Supabase) with `clinic_id` tenancy. Chosen by the founder in the brief.

## Users

- **Primary:** the owner or practice manager of a private dental clinic in India. They are busy, not technical, and judge software by whether it produces booked consultations. They evaluate the product in a sales demo or on a laptop between patients.
- **Secondary:** front-desk staff who take over conversations the assistant escalates.

## Product Purpose

ConsultFlow Dental is a conversion layer for private dental practices. It responds to new enquiries instantly, answers configured non-clinical questions, qualifies intent, offers real consultation slots, books the appointment, schedules reminders and follow-ups, reactivates old enquiries, and shows the clinic its conversion funnel. Success: a practice manager understands within one minute that a lead arrived, was answered, qualified, booked, followed up, and that old leads can be recovered.

## Positioning

"Convert more enquiries into consultations without adding another receptionist." It is not a CRM, chatbot builder, generic AI receptionist, EHR, or practice-management system. The clinic buys booked consultations and recovered leads, not AI.

## Operating Context

- Enquiries arrive from the website form, WhatsApp, Google Business Profile, Instagram, Practo-style directories, and phone callbacks *(inferred channel mix for India)*.
- Common service interests: dental implants, clear aligners, braces, root canal treatment, teeth whitening, veneers, general check-up, pediatric dentistry, wisdom tooth consultation *(inferred)*.
- Currency INR; phone numbers +91; clinic hours typically Mon–Sat with a Sunday half-day *(inferred)*.
- Staff can take over any conversation and return it to the assistant.

## Capabilities and Constraints

- Demo mode must work with no paid API credentials; no real messages are sent.
- The assistant never diagnoses, recommends treatment, guarantees outcomes, invents prices or availability, or claims a confirmation that has not happened. Clinical, urgent, or out-of-scope messages escalate to a human.
- Provider interfaces (messaging, booking, AI) exist so production integrations can be added later.
- Architecture is channel-agnostic and localization-friendly (future AU/UK/US), but V1 does not build international features.

## Brand Commitments

- Product name: **ConsultFlow Dental**. Demo clinic: **SmileCare Dental Clinic**.
- Serious B2B SaaS register. No cartoon dentists, robot illustrations, AI imagery, excessive gradients, or gimmick animation.

## Evidence on Hand

None. There are no customers, testimonials, logos, customer counts, or real results. Every number in the product and on the landing page is synthetic and must be labelled "Demo Data" or "Estimate". Pricing is a placeholder.

## Product Principles

1. Sell outcomes (booked consultations, recovered leads), never "AI".
2. A practice manager must grasp the whole lead-to-booking story in sixty seconds.
3. The assistant knows its limits: it escalates rather than improvises clinical or clinic-specific facts.
4. Every sample number is visibly labelled; nothing is presented as a real result.
5. Staff stay in control: takeover is always one click away.

## Accessibility & Inclusion

WCAG 2.1 AA contrast and keyboard access as the floor *(inferred)*. Works on desktop, laptop, tablet and phone.
