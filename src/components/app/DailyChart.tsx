"use client";

import { useState } from "react";
import type { DailyPoint } from "@/lib/analytics/metrics";

/**
 * Grouped columns: enquiries vs consultations booked per day.
 * One y-axis (both are counts), legend always shown, per-day hover tooltip.
 */
export function DailyChart({ points }: { points: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 28, r: 8, t: 10, b: 26 };
  const max = Math.max(2, ...points.map((p) => Math.max(p.enquiries, p.booked)));
  const niceMax = Math.ceil(max / 2) * 2;
  const ticks = [0, niceMax / 2, niceMax];
  const band = (W - pad.l - pad.r) / points.length;
  const bw = Math.min(8, (band - 4) / 2);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / niceMax);
  const hp = hover !== null ? points[hover] : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-[12.5px] text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-series-1" aria-hidden /> Enquiries
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-series-2" aria-hidden /> Consultations booked
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Enquiries and consultations booked per day">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth={1} />
              <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--ink-3)" className="tabular">
                {t}
              </text>
            </g>
          ))}
          {points.map((p, i) => {
            const x0 = pad.l + i * band + band / 2 - bw - 1;
            const bars: [number, string][] = [
              [p.enquiries, "var(--series-1)"],
              [p.booked, "var(--series-2)"],
            ];
            return (
              <g key={p.key} opacity={hover === null || hover === i ? 1 : 0.45}>
                {bars.map(([v, c], j) =>
                  v > 0 ? <path key={j} d={colPath(x0 + j * (bw + 2), y(v), bw, y(0) - y(v))} fill={c} /> : null,
                )}
                {(i % 5 === 0 || i === points.length - 1) && (
                  <text x={pad.l + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--ink-3)">
                    {p.label}
                  </text>
                )}
                <rect
                  x={pad.l + i * band}
                  y={pad.t}
                  width={band}
                  height={H - pad.t - pad.b}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  tabIndex={0}
                  aria-label={`${p.label}: ${p.enquiries} enquiries, ${p.booked} booked`}
                />
              </g>
            );
          })}
        </svg>
        {hp && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-[6px] bg-board px-3 py-2 text-[12px] text-board-ink shadow-lg"
            style={{ left: `${((pad.l + hover * band + band / 2) / W) * 100}%` }}
          >
            <div className="font-semibold">{hp.label}</div>
            <div className="mt-1 flex items-center gap-1.5 tabular">
              <span className="size-2 rounded-[2px] bg-series-1" /> {hp.enquiries} enquiries
            </div>
            <div className="flex items-center gap-1.5 tabular">
              <span className="size-2 rounded-[2px] bg-series-2" /> {hp.booked} booked
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Column with a 4px (or smaller) rounded top, square at the baseline. */
function colPath(x: number, top: number, w: number, h: number) {
  const r = Math.min(3, w / 2, h);
  return `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`;
}
