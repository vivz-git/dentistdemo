import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" aria-label="ConsultFlow Dental home">
          <Logo />
        </Link>
        <div className="my-auto w-full max-w-[420px] py-12">
          <h1 className="display text-[34px] font-semibold">Open the SmileCare demo</h1>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">
            You&apos;ll sign in as Priya Nair, practice manager at SmileCare Dental Clinic, a fictional clinic with a month of synthetic enquiries.
            Nothing you do in the demo sends a real message.
          </p>
          <form action="/api/auth/demo" method="post" className="mt-8 grid gap-4">
            <div className="grid gap-1.5">
              <span className="text-[13.5px] font-medium">Account</span>
              <div className="flex h-12 items-center gap-3 rounded-[6px] border border-line-strong bg-surface px-3">
                <span className="grid size-7 place-items-center rounded-[4px] bg-[var(--st-qualified-wash)] text-[12px] font-semibold text-[var(--st-qualified)]">PN</span>
                <span className="text-[14.5px]">
                  Priya Nair <span className="text-ink-3">· Practice manager</span>
                </span>
              </div>
            </div>
            <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-[6px] bg-ink px-5 text-[15px] font-medium text-white hover:bg-[#2a313b] active:translate-y-px">
              Continue to the demo <ArrowRight weight="bold" className="size-4" />
            </button>
            <p className="text-[12.5px] leading-relaxed text-ink-3">
              Demo sign-in only. Production clinics sign in with email and a one-time code, with roles for owners, managers and front desk.
            </p>
          </form>
        </div>
      </div>
      <div className="hidden bg-board p-12 text-board-ink lg:flex lg:flex-col lg:justify-end">
        <p className="max-w-[34ch] text-[22px] font-medium leading-snug">
          In the next minute you&apos;ll see an enquiry arrive, get answered, choose a time, and land on the clinic&apos;s diary.
        </p>
        <ol className="mt-8 grid gap-3 text-[14.5px] text-board-ink-2">
          <li>1. Press &quot;Simulate new enquiry&quot; on the dashboard.</li>
          <li>2. Reply as the patient, or tap a suggested reply.</li>
          <li>3. Pick a time and watch the dashboard update.</li>
        </ol>
      </div>
    </main>
  );
}
