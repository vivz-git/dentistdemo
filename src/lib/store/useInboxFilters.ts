"use client";

import { create } from "zustand";
import type { LeadSource, LeadStatus } from "@/lib/domain/types";

interface InboxFilters {
  status: LeadStatus | "all" | "attention";
  source: LeadSource | "all";
  service: string;
  query: string;
  set: (p: Partial<Omit<InboxFilters, "set" | "reset">>) => void;
  reset: () => void;
}

const initial = { status: "all" as const, source: "all" as const, service: "all", query: "" };

export const useInboxFilters = create<InboxFilters>((set) => ({
  ...initial,
  set: (p) => set(p),
  reset: () => set(initial),
}));
