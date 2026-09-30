import clsx from "clsx";

/** Four-cell board mark: three settled cells and one live (signal) cell. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={clsx("size-5 shrink-0", className)}>
      <rect x="1" y="1" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="11" y="1" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="1" y="11" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.55" />
      <rect x="11" y="11" width="8" height="8" rx="1.5" fill="var(--signal)" />
    </svg>
  );
}

export function Logo({ className, tone = "ink" }: { className?: string; tone?: "ink" | "board" }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-[-0.01em]", tone === "board" ? "text-board-ink" : "text-ink", className)}>
      <LogoMark />
      <span className="text-[15px]">
        ConsultFlow <span className="font-normal opacity-70">Dental</span>
      </span>
    </span>
  );
}
