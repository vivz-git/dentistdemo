import clsx from "clsx";

/** Labels synthetic numbers wherever they appear. */
export function DemoTag({ className, children = "Demo data" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span className={clsx("inline-flex h-5 items-center rounded-[3px] border border-dashed border-line-strong px-1.5 text-[11px] font-medium text-ink-3", className)}>
      {children}
    </span>
  );
}
