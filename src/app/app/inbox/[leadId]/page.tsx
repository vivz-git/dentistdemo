"use client";

import clsx from "clsx";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, IdentificationCard, X } from "@phosphor-icons/react";
import { Conversation } from "@/components/app/Conversation";
import { LeadDetails } from "@/components/app/LeadDetails";
import { InboxFilters, LeadListCompact } from "@/components/app/LeadList";
import { useClinicData } from "@/lib/store/hooks";

export default function LeadConversationPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const data = useClinicData();
  const lead = data.leads.find((l) => l.id === leadId);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!lead) {
    return (
      <div className="px-6 py-16">
        <h1 className="text-[20px] font-semibold">Lead not found</h1>
        <p className="mt-2 text-ink-2">It may have been removed when the demo data was reset.</p>
        <Link href="/app/inbox" className="mt-4 inline-block underline underline-offset-4">
          Back to the inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-[520px]">
      <div className="hidden w-[300px] shrink-0 flex-col border-r border-line bg-surface 2xl:flex">
        <div className="border-b border-line p-3">
          <InboxFilters compact />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <LeadListCompact activeId={leadId} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-line bg-bg px-4 py-2 2xl:hidden">
          <Link href="/app/inbox" className="flex items-center gap-1.5 text-[13px] text-ink-2 hover:text-ink">
            <ArrowLeft className="size-4" /> Inbox
          </Link>
          <button onClick={() => setDetailsOpen(true)} className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[13px] text-ink-2 hover:bg-surface-2 lg:hidden">
            <IdentificationCard className="size-4" /> Lead details
          </button>
        </div>
        <Conversation key={leadId} leadId={leadId} />
      </div>

      <div className="hidden w-[330px] shrink-0 lg:flex">
        <LeadDetails leadId={leadId} />
      </div>

      <div className={clsx("fixed inset-0 z-40 lg:hidden", !detailsOpen && "pointer-events-none")} aria-hidden={!detailsOpen}>
        <button className={clsx("absolute inset-0 bg-ink/40 transition-opacity", detailsOpen ? "opacity-100" : "opacity-0")} onClick={() => setDetailsOpen(false)} aria-label="Close details" tabIndex={detailsOpen ? 0 : -1} />
        <div className={clsx("absolute inset-y-0 right-0 flex w-[min(360px,92vw)] flex-col bg-surface shadow-xl transition-transform duration-200", detailsOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="flex items-center justify-between border-b border-line px-4 py-2">
            <span className="text-[14px] font-semibold">Lead details</span>
            <button onClick={() => setDetailsOpen(false)} className="grid size-8 place-items-center rounded-[6px] hover:bg-surface-2" aria-label="Close details" tabIndex={detailsOpen ? 0 : -1}>
              <X className="size-4" />
            </button>
          </div>
          {detailsOpen && <LeadDetails leadId={leadId} />}
        </div>
      </div>
    </div>
  );
}
