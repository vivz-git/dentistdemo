import Link from "next/link";
import {
  ArrowRight,
  ArrowsClockwise,
  CalendarCheck,
  ChatCircleText,
  CheckCircle,
  HandPalm,
  Prohibit,
  UserSwitch,
} from "@phosphor-icons/react/dist/ssr";
import { ChatBubble } from "@/components/app/ChatBubble";
import { DemoRequestForm } from "@/components/landing/DemoRequestForm";
import { LiveBoard } from "@/components/landing/LiveBoard";
import { RoiCalculator } from "@/components/landing/RoiCalculator";
import { ButtonLink } from "@/components/ui/Button";
import { DemoTag } from "@/components/ui/DemoTag";
import { Logo } from "@/components/ui/Logo";
import { CLINICAL_ESCALATION_MESSAGE } from "@/lib/ai/guardrails";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#reactivation", label: "Reactivation" },
  { href: "#analytics", label: "Analytics" },
  { href: "#pricing", label: "Pricing" },
];

const FUNNEL = [
  { label: "Enquiries", value: 214 },
  { label: "Contacted", value: 209 },
  { label: "Qualified", value: 131 },
  { label: "Consultation booked", value: 74 },
  { label: "Consultation attended", value: 58 },
];

const STEPS = [
  { title: "Replies in seconds, day or night", body: "Every website form, WhatsApp message and missed call gets a reply before the patient moves on to the next clinic." },
  { title: "Answers from your clinic's own information", body: "Timings, location, parking, payment options and consultation fees come from what you configure. Nothing else." },
  { title: "Finds out what they need", body: "Treatment interest and a convenient time, captured in two or three short messages." },
  { title: "Offers real open times", body: "Slots come from your working hours and diary, so the assistant cannot offer a time you don't have." },
  { title: "Books, reminds and follows up", body: "The consultation is booked, reminders go out 24 hours and 2 hours before, and quiet leads get a polite nudge." },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/92 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4 sm:px-6" aria-label="Main">
          <Link href="/" aria-label="ConsultFlow Dental home">
            <Logo />
          </Link>
          <ul className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="rounded-[6px] px-3 py-2 text-[14px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="ml-auto flex items-center gap-2">
            <ButtonLink href="#book" variant="ghost" size="sm" className="max-sm:hidden">
              Book a Demo
            </ButtonLink>
            <ButtonLink href="/login" variant="primary" size="sm">
              View Live Demo
            </ButtonLink>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-[1240px] px-4 pb-16 pt-10 sm:px-6 lg:pb-24 lg:pt-14">
          <h1 className="display max-w-[20ch] text-[40px] font-semibold sm:text-[54px] lg:max-w-none lg:text-[60px] xl:text-[66px]">
            Turn More Dental Enquiries
            <br className="max-lg:hidden" /> Into Booked Consultations.
          </h1>
          <div className="mt-8 grid items-start gap-10 lg:mt-10 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
            <div className="max-w-[440px]">
              <p className="text-[17px] leading-relaxed text-ink-2 sm:text-[18px]">Respond instantly, follow up automatically, and recover leads your front desk never got to.</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/login" variant="signal" size="lg">
                  View Live Demo <ArrowRight weight="bold" className="size-4" />
                </ButtonLink>
                <ButtonLink href="#book" variant="secondary" size="lg">
                  Book a Demo
                </ButtonLink>
              </div>
            </div>
            <LiveBoard />
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="display max-w-[22ch] text-[32px] font-semibold sm:text-[40px]">Most enquiries are lost in the gap before anyone replies.</h2>
            <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
              Patients enquire after work, between meetings, late at night. By the time the front desk calls back, many have already booked with the
              clinic that answered first. Here is the same enquiry, two ways.
            </p>

            <div className="mt-12 grid gap-4">
              <Lane
                tone="muted"
                title="Without ConsultFlow"
                events={[
                  { t: "9:12 pm", text: "Enquiry about implants arrives. The clinic closed at 7:30." },
                  { t: "10:40 am", text: "Front desk calls back between patients. No answer." },
                  { t: "4:15 pm", text: "Second call. The patient has booked elsewhere." },
                ]}
                end={{ label: "Lost", tone: "lost" }}
              />
              <Lane
                tone="strong"
                title="With ConsultFlow"
                events={[
                  { t: "9:12 pm", text: "Enquiry about implants arrives." },
                  { t: "9:12 pm", text: "Reply in 21 seconds. Parking and fee questions answered." },
                  { t: "9:16 pm", text: "Thursday 6 pm chosen from three open times. Reminder set." },
                ]}
                end={{ label: "Booked", tone: "booked" }}
              />
            </div>
            <p className="mt-4 text-[12.5px] text-ink-3">Illustrative example.</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto grid max-w-[1240px] scroll-mt-20 gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h2 className="display text-[32px] font-semibold sm:text-[40px]">How ConsultFlow works</h2>
            <p className="mt-4 max-w-[52ch] text-[16.5px] leading-relaxed text-ink-2">
              A booking assistant that lives on your WhatsApp and website, works only from your clinic&apos;s information, and hands over to your team
              the moment a conversation needs a person.
            </p>
            <ol className="mt-10 grid gap-7">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid grid-cols-[36px_1fr] gap-4">
                  <span className="grid size-9 place-items-center rounded-[6px] bg-ink text-[14px] font-semibold text-white tabular">{i + 1}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold">{s.title}</h3>
                    <p className="mt-1 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[10px] border border-line bg-surface-2 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
                <div>
                  <div className="text-[15px] font-semibold">Rahul Menon</div>
                  <div className="text-[12.5px] text-ink-3">Website form · Dental implants</div>
                </div>
                <DemoTag />
              </div>
              <div className="grid gap-4">
                <ChatBubble author="patient" time="9:12 pm" body="Hi, I'm looking at implants for a missing back tooth. Is there parking near the clinic?" />
                <ChatBubble
                  author="ai"
                  time="9:12 pm"
                  body="Hi Rahul, thanks for your enquiry about dental implants at SmileCare Dental Clinic. I'm the clinic's automated booking assistant. Yes, there's free parking in the Lakeview Arcade basement. What time of day usually works for you?"
                />
                <ChatBubble author="patient" time="9:14 pm" body="Evenings, after 5." />
                <ChatBubble
                  author="ai"
                  kind="slot_offer"
                  time="9:14 pm"
                  body="These are the next open consultation times (30 minutes):"
                  slots={[
                    { start: "a", end: "a", label: "Wed, 2 Oct, 5:30 pm" },
                    { start: "b", end: "b", label: "Thu, 3 Oct, 6:00 pm" },
                    { start: "c", end: "c", label: "Fri, 4 Oct, 7:00 pm" },
                  ]}
                />
                <ChatBubble author="patient" time="9:16 pm" body="2" />
                <ChatBubble
                  author="ai"
                  kind="booking_confirmation"
                  time="9:16 pm"
                  body="You're booked for your implant consultation on Thu, 3 Oct, 6:00 pm. We'll send a reminder before your visit."
                />
                <ChatBubble author="system" body="Reminders scheduled for 24 hours and 2 hours before." />
              </div>
            </div>
          </div>
        </section>

        {/* Funnel */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <h2 className="display max-w-[24ch] text-[32px] font-semibold sm:text-[40px]">See exactly where each enquiry stands.</h2>
              <DemoTag className="mb-2">Demo data, sample month</DemoTag>
            </div>
            <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
              Every lead carries a status, and every status rolls up into one funnel. You see how many enquiries were answered, qualified, booked
              and seen, and where the rest dropped off.
            </p>
            <div className="mt-10 grid gap-3">
              {FUNNEL.map((f, i) => {
                const prev = i === 0 ? null : FUNNEL[i - 1].value;
                return (
                  <div key={f.label} className="grid grid-cols-[minmax(120px,190px)_1fr] items-center gap-4 sm:grid-cols-[220px_1fr_120px]">
                    <div className="text-[14.5px] font-medium">{f.label}</div>
                    <div className="h-9 rounded-[4px] bg-surface-2">
                      <div
                        className="flex h-full items-center justify-end rounded-r-[4px] bg-series-1 pr-3 text-[13px] font-semibold text-white tabular"
                        style={{ width: `${(f.value / FUNNEL[0].value) * 100}%` }}
                      >
                        {f.value}
                      </div>
                    </div>
                    <div className="text-[13px] text-ink-3 tabular max-sm:col-start-2">{prev ? `${Math.round((f.value / prev) * 100)}% of previous stage` : "All enquiries"}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Reactivation */}
        <section id="reactivation" className="mx-auto grid max-w-[1240px] scroll-mt-20 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:py-24">
          <div className="order-2 lg:order-1">
            <div className="rounded-[10px] bg-board p-5 text-board-ink sm:p-7">
              <div className="flex items-center justify-between gap-3 text-[12.5px] text-board-ink-2">
                <span className="flex items-center gap-2">
                  <ArrowsClockwise className="size-4" /> Reactivation campaign
                </span>
                <span>Simulated results · demo data</span>
              </div>
              <p className="mt-5 rounded-[8px] bg-board-2 p-4 text-[15px] leading-relaxed">
                Hi Rahul, you previously enquired about an appointment at SmileCare Dental Clinic. Would you still like to book a consultation? Reply YES for
                available times, or STOP to opt out.
              </p>
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
                {[
                  ["Messages sent", "36"],
                  ["Replies", "11"],
                  ["Booked again", "4"],
                  ["Opted out", "2"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[12.5px] text-board-ink-2">{k}</dt>
                    <dd className="board-type mt-1 text-[30px] font-semibold leading-none tabular">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="display text-[32px] font-semibold sm:text-[40px]">Your old enquiries are your cheapest new patients.</h2>
            <p className="mt-4 max-w-[48ch] text-[16.5px] leading-relaxed text-ink-2">
              Pick enquiries that went quiet, choose a message, and launch. Replies are handled by the same assistant, interested patients are
              offered times, and anyone who says stop is never contacted again.
            </p>
            <ul className="mt-6 grid gap-3 text-[15px]">
              {["Audience by treatment, status and months since enquiry", "Consent and opt-out respected on every send", "Recovered consultations tracked to the campaign"].map((t) => (
                <li key={t} className="flex gap-3">
                  <CheckCircle weight="fill" className="mt-0.5 size-5 shrink-0 text-ink" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Human handoff */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1240px] px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="display max-w-[24ch] text-[32px] font-semibold sm:text-[40px]">Your team stays in charge of every conversation.</h2>
            <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
              ConsultFlow handles booking and clinic information. Anything clinical, urgent or unusual goes straight to a person, and staff can take
              over any chat with one click.
            </p>
            <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr_1.1fr]">
              <div>
                <h3 className="flex items-center gap-2 text-[16px] font-semibold">
                  <ChatCircleText className="size-5" /> The assistant will
                </h3>
                <ul className="mt-4 grid gap-2.5 text-[15px] text-ink-2">
                  {["Answer your configured FAQs", "Explain hours, location and payment options", "Ask what treatment and time suits", "Offer open times and book them", "Send reminders and follow-ups", "Hand over to your team"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <CheckCircle className="mt-0.5 size-[18px] shrink-0 text-[var(--st-booked)]" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-[16px] font-semibold">
                  <HandPalm className="size-5" /> The assistant will never
                </h3>
                <ul className="mt-4 grid gap-2.5 text-[15px] text-ink-2">
                  {["Diagnose symptoms or suggest treatment", "Recommend medicines", "Promise outcomes", "Quote a price you haven't set", "Offer a time that isn't open", "Say a booking is confirmed when it isn't"].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Prohibit className="mt-0.5 size-[18px] shrink-0 text-[var(--st-dnc)]" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-line bg-surface-2 p-4 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                  <UserSwitch className="size-4" /> When a patient asks a clinical question
                </div>
                <div className="grid gap-3">
                  <ChatBubble author="patient" body="My gums bleed when I brush. Is that serious? What should I take?" />
                  <ChatBubble author="ai" kind="escalation" body={CLINICAL_ESCALATION_MESSAGE} />
                  <ChatBubble author="system" body="Handed to the front desk. Assistant paused." />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Analytics / ROI */}
        <section id="analytics" className="mx-auto max-w-[1240px] scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
          <h2 className="display max-w-[26ch] text-[32px] font-semibold sm:text-[40px]">Know what faster replies are worth to your clinic.</h2>
          <p className="mt-4 max-w-[62ch] text-[16.5px] leading-relaxed text-ink-2">
            The dashboard tracks response time, booking rate, recovered leads and the estimated value of booked consultations. Try the numbers for
            your own clinic.
          </p>
          <div className="mt-10">
            <RoiCalculator />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-[1240px] scroll-mt-20 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-24">
            <div>
              <h2 className="display text-[32px] font-semibold sm:text-[40px]">Simple monthly pricing per clinic.</h2>
              <p className="mt-4 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-2">
                One plan per location, no per-message surprises. We&apos;re onboarding a small group of founding clinics and set pricing with each of
                them during the pilot.
              </p>
            </div>
            <div className="rounded-[10px] border border-ink bg-bg p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="text-[20px] font-semibold">Founding clinic pilot</h3>
                <span className="text-[14px] text-ink-2">Pricing shared on the demo call</span>
              </div>
              <ul className="mt-6 grid gap-3 text-[15px] sm:grid-cols-2">
                {["Instant replies on WhatsApp and website", "Booking into your working hours", "Reminders and no-reply follow-ups", "Reactivation campaigns", "Staff takeover and handoff rules", "Conversion dashboard and weekly report"].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <CalendarCheck className="mt-0.5 size-[18px] shrink-0" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="#book" variant="primary">
                  Book a Demo
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary">
                  View Live Demo
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        {/* Book */}
        <section id="book" className="mx-auto grid max-w-[1240px] scroll-mt-20 gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:py-24">
          <div>
            <h2 className="display max-w-[18ch] text-[32px] font-semibold sm:text-[40px]">See it running on a clinic like yours.</h2>
            <p className="mt-4 max-w-[46ch] text-[16.5px] leading-relaxed text-ink-2">
              We&apos;ll walk through a full enquiry, from first message to booked consultation, and show what your own funnel would look like.
            </p>
          </div>
          <DemoRequestForm />
        </section>
      </main>

      <footer className="bg-board text-board-ink">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <Logo tone="board" />
            <p className="mt-3 max-w-[40ch] text-[13.5px] leading-relaxed text-board-ink-2">A conversion layer for private dental practices.</p>
          </div>
          <div className="grid gap-3 text-[12.5px] leading-relaxed text-board-ink-2">
            <p>
              ConsultFlow is a booking and follow-up tool. It does not provide clinical advice, diagnosis or treatment recommendations. Clinical
              questions are always routed to the clinic&apos;s dental professionals.
            </p>
            <p>SmileCare Dental Clinic, its patients and all figures shown on this site and in the demo are synthetic, created for demonstration.</p>
            <p>© {new Date().getFullYear()} ConsultFlow</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Lane({
  title,
  events,
  end,
  tone,
}: {
  title: string;
  events: { t: string; text: string }[];
  end: { label: string; tone: "lost" | "booked" };
  tone: "muted" | "strong";
}) {
  return (
    <div className={`grid gap-4 rounded-[10px] p-5 sm:p-6 lg:grid-cols-[180px_1fr_120px] lg:items-center ${tone === "strong" ? "bg-board text-board-ink" : "border border-line bg-bg"}`}>
      <div className="text-[15px] font-semibold">{title}</div>
      <ol className="grid gap-4 sm:grid-cols-3">
        {events.map((e, i) => (
          <li key={i} className="relative grid content-start gap-1 pl-4">
            <span aria-hidden className={`absolute left-0 top-1.5 size-2 rounded-[2px] ${tone === "strong" ? "bg-signal" : "bg-ink-3"}`} />
            <span className={`tabular text-[13px] font-semibold ${tone === "strong" ? "text-signal" : "text-ink"}`}>{e.t}</span>
            <span className={`text-[14px] leading-snug ${tone === "strong" ? "text-board-ink-2" : "text-ink-2"}`}>{e.text}</span>
          </li>
        ))}
      </ol>
      <div className="lg:justify-self-end">
        <span
          className="board-type inline-flex h-7 items-center rounded-[4px] px-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={end.tone === "booked" ? { background: "var(--signal)", color: "var(--ink)" } : { background: "var(--st-lost-wash)", color: "var(--st-lost)" }}
        >
          {end.label}
        </span>
      </div>
    </div>
  );
}
