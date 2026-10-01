"use client";

import { InboxFilters, LeadTable, useFilteredLeads } from "@/components/app/LeadList";
import { PageHeader } from "@/components/app/PageHeader";
import { DemoTag } from "@/components/ui/DemoTag";

export default function InboxPage() {
  const shown = useFilteredLeads().length;
  return (
    <div className="pb-16">
      <PageHeader
        title="Lead inbox"
        description={
          <>
            Every enquiry from every channel, with its status and next step. <DemoTag className="ml-1 align-middle" />
          </>
        }
      />
      <div className="grid gap-4 px-4 pt-5 sm:px-6">
        <InboxFilters />
        <div className="text-[12.5px] text-ink-3 tabular">{shown} leads</div>
        <LeadTable />
      </div>
    </div>
  );
}
