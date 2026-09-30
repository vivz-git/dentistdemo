"use client";

import { useEffect, useState } from "react";
import type { ClinicData } from "@/lib/domain/types";
import { useDemoStore } from "./useDemoStore";

/** Only call below <AppShell>, which renders children after data is ready. */
export function useClinicData(): ClinicData {
  const data = useDemoStore((s) => s.data);
  if (!data) throw new Error("useClinicData used before demo data is ready");
  return data;
}

/** A clock that re-renders every `ms` so relative times stay fresh. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}
