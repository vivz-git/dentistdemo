"use client";

import { useId, useState } from "react";
import { inr, roiModel } from "@/lib/analytics/metrics";

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[14px] text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="tabular text-[15px] font-semibold">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-[var(--ink)]"
      />
    </div>
  );
}

export function RoiCalculator() {
  const [enquiries, setEnquiries] = useState(100);
  const [current, setCurrent] = useState(18);
  const [improved, setImproved] = useState(40);
  const [value, setValue] = useState(18000);
  const r = roiModel({ monthlyEnquiries: enquiries, currentBookingRate: current, improvedBookingRate: Math.max(improved, current), avgValue: value });

  return (
    <div className="grid gap-8 rounded-[10px] border border-line bg-surface p-5 sm:p-8 lg:grid-cols-[1fr_minmax(300px,0.9fr)] lg:gap-12">
      <div className="grid content-start gap-6">
        <Slider label="Enquiries per month" value={enquiries} min={20} max={500} step={10} onChange={setEnquiries} format={(v) => `${v}`} />
        <Slider label="Share booked today" value={current} min={5} max={60} step={1} onChange={setCurrent} format={(v) => `${v}%`} />
        <Slider label="Share booked with instant reply and follow-up" value={improved} min={5} max={80} step={1} onChange={setImproved} format={(v) => `${Math.max(v, current)}%`} />
        <Slider label="Average value of a booked consultation" value={value} min={2000} max={80000} step={1000} onChange={setValue} format={(v) => inr(v)} />
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          Every number here is an input you control, not a result we claim. Use your own booking rate and case values; your clinic&apos;s real
          numbers appear in the analytics once a pilot is running.
        </p>
      </div>
      <div className="grid content-start gap-5 rounded-[8px] bg-board p-6 text-board-ink">
        <div className="text-[13px] text-board-ink-2">Each month, {enquiries} enquiries become</div>
        <div className="grid grid-cols-2 gap-4 border-b border-board-line pb-5">
          <div>
            <div className="tabular text-[34px] font-semibold leading-none board-type">{Math.round(r.current)}</div>
            <div className="mt-1.5 text-[12.5px] text-board-ink-2">booked today</div>
          </div>
          <div>
            <div className="tabular text-[34px] font-semibold leading-none board-type text-signal">{Math.round(r.improved)}</div>
            <div className="mt-1.5 text-[12.5px] text-board-ink-2">booked with ConsultFlow</div>
          </div>
        </div>
        <div>
          <div className="tabular text-[44px] font-semibold leading-none board-type">+{Math.round(r.additional)}</div>
          <div className="mt-1.5 text-[13px] text-board-ink-2">additional consultations a month</div>
        </div>
        <div>
          <div className="tabular text-[26px] font-semibold leading-none board-type">{inr(r.value)}</div>
          <div className="mt-1.5 text-[13px] text-board-ink-2">estimated monthly value. An estimate from your inputs, not a guarantee.</div>
        </div>
      </div>
    </div>
  );
}
