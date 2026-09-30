import { FUNNEL_STAGES } from "@/lib/domain/labels";
import type { FunnelCounts } from "@/lib/analytics/metrics";

/** Single-series horizontal funnel. Title names the series, so no legend. */
export function FunnelChart({ counts, compact }: { counts: FunnelCounts; compact?: boolean }) {
  const values = [counts.enquiries, counts.contacted, counts.qualified, counts.booked, counts.attended];
  const max = Math.max(1, values[0]);
  return (
    <div className="grid gap-2.5" role="table" aria-label="Conversion funnel">
      {FUNNEL_STAGES.map((label, i) => {
        const v = values[i];
        const prev = i === 0 ? undefined : values[i - 1];
        const stepPct = prev ? Math.round((v / Math.max(1, prev)) * 100) : undefined;
        const ofAll = Math.round((v / max) * 100);
        return (
          <div key={label} role="row" className={`group grid items-center gap-3 ${compact ? "grid-cols-[132px_1fr_52px]" : "grid-cols-[minmax(110px,170px)_1fr_64px] sm:grid-cols-[190px_1fr_64px_150px]"}`}>
            <span role="rowheader" className="text-[13.5px] font-medium text-ink">
              {label}
            </span>
            <span role="cell" className="relative h-7 rounded-[4px] bg-surface-2" title={`${label}: ${v} (${ofAll}% of enquiries)`}>
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] bg-series-1 transition-[width] duration-500 ease-out group-hover:brightness-110"
                style={{ width: `${Math.max(v > 0 ? 1.5 : 0, (v / max) * 100)}%` }}
              />
            </span>
            <span role="cell" className="text-right text-[15px] font-semibold tabular">
              {v}
            </span>
            {!compact && (
              <span role="cell" className="text-[12.5px] text-ink-3 tabular max-sm:hidden">
                {stepPct === undefined ? "100% of enquiries" : `${stepPct}% of previous · ${ofAll}% overall`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
