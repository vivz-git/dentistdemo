"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowCounterClockwise,
  ArrowsClockwise,
  CalendarDots,
  ChartLineUp,
  GearSix,
  List,
  Plus,
  SignOut,
  SquaresFour,
  Tray,
  X,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { useDemoStore } from "@/lib/store/useDemoStore";

const NAV = [
  { href: "/app", label: "Dashboard", icon: SquaresFour, exact: true },
  { href: "/app/inbox", label: "Lead inbox", icon: Tray },
  { href: "/app/appointments", label: "Appointments", icon: CalendarDots },
  { href: "/app/reactivation", label: "Reactivation", icon: ArrowsClockwise },
  { href: "/app/analytics", label: "Analytics", icon: ChartLineUp },
  { href: "/app/settings", label: "Clinic settings", icon: GearSix },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const data = useDemoStore((s) => s.data);
  const hydrated = useDemoStore((s) => s.hydrated);
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fallback in case storage is unavailable (private mode) and rehydration never reports.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const s = useDemoStore.getState();
      if (!s.hydrated) {
        s.ensureData();
        useDemoStore.setState({ hydrated: true });
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);

  const needsHuman = data?.leads.filter((l) => l.status === "needs_human").length ?? 0;
  const newCount = data?.leads.filter((l) => l.status === "new").length ?? 0;

  function simulate() {
    const id = useDemoStore.getState().simulateEnquiry();
    router.push(`/app/inbox/${id}`);
  }

  async function signOut() {
    await fetch("/api/auth/demo", { method: "DELETE" });
    router.push("/");
  }

  const nav = (
    <nav aria-label="App" className="grid gap-0.5">
      {NAV.map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        const Icon = n.icon;
        const badge = n.href === "/app/inbox" ? needsHuman + newCount : 0;
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative flex h-10 items-center gap-3 rounded-[6px] px-3 text-[14px] transition-colors",
              active ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(20,24,31,0.08)]" : "text-ink-2 hover:bg-surface-3 hover:text-ink",
            )}
          >
            {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-[2px] bg-signal" />}
            <Icon className="size-[18px]" weight={active ? "fill" : "regular"} />
            {n.label}
            {badge > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-[4px] bg-[var(--st-human)] px-1 text-[11px] font-semibold text-white tabular" aria-label={`${badge} need attention`}>
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <div className="demo-stripe h-1" aria-hidden />
      <div className="flex min-h-[calc(100dvh-4px)]">
        <aside className="sticky top-1 hidden h-[calc(100dvh-4px)] w-[248px] shrink-0 flex-col border-r border-line bg-surface-2 px-3 py-4 lg:flex">
          <Link href="/" className="px-2" aria-label="ConsultFlow home">
            <Logo />
          </Link>
          <div className="mt-5 rounded-[6px] border border-line bg-surface px-3 py-2.5">
            <div className="text-[13.5px] font-semibold">{data?.clinic.name ?? "SmileCare Dental Clinic"}</div>
            <div className="text-[12px] text-ink-3">HSR Layout, Bengaluru</div>
          </div>
          <div className="mt-4">{nav}</div>
          <div className="mt-auto grid gap-2">
            <DemoCard />
            <button onClick={signOut} className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13.5px] text-ink-2 hover:bg-surface-3 hover:text-ink">
              <SignOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-1 z-20 flex h-14 items-center gap-3 border-b border-line bg-bg/95 px-4 backdrop-blur-sm sm:px-6">
            <button className="grid size-9 place-items-center rounded-[6px] hover:bg-surface-2 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <List className="size-5" />
            </button>
            <span className="lg:hidden">
              <Logo />
            </span>
            <span className="hidden items-center gap-2 rounded-[4px] bg-signal-wash px-2 py-1 text-[12px] font-semibold text-ink sm:inline-flex">
              <span className="size-1.5 rounded-[1px] bg-signal-strong" aria-hidden /> Demo Mode · synthetic data, no real messages sent
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="signal" size="sm" onClick={simulate} disabled={!data}>
                <Plus weight="bold" className="size-3.5" /> <span className="max-[380px]:hidden">Simulate</span> new enquiry
              </Button>
            </div>
          </header>

          <main className="flex-1">{data && hydrated ? children : <ShellSkeleton />}</main>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-ink/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[280px] flex-col bg-surface-2 p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <Logo />
              <button className="grid size-9 place-items-center rounded-[6px] hover:bg-surface-3" onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            <div className="mt-auto grid gap-2">
              <DemoCard />
              <button onClick={signOut} className="flex h-9 items-center gap-2 rounded-[6px] px-3 text-[13.5px] text-ink-2 hover:bg-surface-3">
                <SignOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}

function DemoCard() {
  const reset = useDemoStore((s) => s.resetDemo);
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="rounded-[6px] border border-dashed border-line-strong bg-surface px-3 py-3 text-[12.5px] text-ink-2">
      <div className="font-semibold text-ink">Demo Mode</div>
      <p className="mt-1 leading-relaxed">All patients and numbers are synthetic. Messages are simulated, never sent.</p>
      {confirming ? (
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              reset();
              setConfirming(false);
            }}
          >
            Reset
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <button onClick={() => setConfirming(true)} className="mt-2 inline-flex items-center gap-1.5 font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
          <ArrowCounterClockwise className="size-3.5" /> Reset demo data
        </button>
      )}
    </div>
  );
}

function Toaster() {
  const toasts = useDemoStore((s) => s.toasts);
  const dismiss = useDemoStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 grid w-[min(380px,calc(100vw-2rem))] gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "rise pointer-events-auto flex items-start gap-3 rounded-[8px] px-4 py-3 text-[13.5px] shadow-[0_12px_32px_-12px_rgba(20,24,31,0.45)]",
            t.tone === "success" && "bg-board text-board-ink",
            t.tone === "info" && "bg-board text-board-ink",
            t.tone === "warn" && "bg-[var(--st-human)] text-white",
          )}
        >
          {t.tone === "success" && <span aria-hidden className="mt-1 size-2 shrink-0 rounded-[2px] bg-signal" />}
          <span className="flex-1">{t.text}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="grid gap-6 p-4 sm:p-6" aria-busy="true" aria-label="Loading demo data">
      <div className="h-8 w-64 animate-pulse rounded-[6px] bg-surface-3" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-[8px] bg-surface-2" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-[8px] bg-surface-2" />
    </div>
  );
}
