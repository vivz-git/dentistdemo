"use client";

import clsx from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CaretDown, PaperPlaneTilt, ShieldCheck, Trash } from "@phosphor-icons/react";
import { ChatBubble } from "@/components/app/ChatBubble";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { DemoTag } from "@/components/ui/DemoTag";
import { pct } from "@/lib/analytics/metrics";
import { RECIPIENT_LABEL, STATUS_LABEL } from "@/lib/domain/labels";
import type { Campaign, CampaignAudience, LeadStatus, RecipientStatus } from "@/lib/domain/types";
import { eligibleForCampaign, renderCampaignMessage } from "@/lib/store/actions";
import { useClinicData, useNow } from "@/lib/store/hooks";
import { useDemoStore } from "@/lib/store/useDemoStore";
import { relativeTime, shortDate } from "@/lib/ui/format";
import { serviceName } from "@/lib/ui/leadInfo";

const RECIPIENT_TONE: Record<RecipientStatus, string> = {
  booked: "booked",
  interested: "qualified",
  replied: "contacted",
  needs_human: "human",
  unsubscribed: "dnc",
  no_response: "lost",
  sent: "new",
  queued: "new",
};
const RECIPIENT_ORDER: RecipientStatus[] = ["booked", "interested", "replied", "needs_human", "unsubscribed", "no_response", "sent"];

const DEFAULT_MESSAGE =
  "Hi {first_name}, you previously enquired about {service} at {clinic_name}. Would you still like to book a consultation? Reply YES and I'll share available times, or STOP to opt out.";

export default function ReactivationPage() {
  const data = useClinicData();
  const now = useNow(5_000);
  const tz = data.clinic.timezone;

  const oldLeads = data.leads.filter((l) => (l.status === "lost" || l.status === "contacted") && now.getTime() - new Date(l.lastActivityAt).getTime() > 30 * 86400_000);
  const broadAudience: CampaignAudience = { minDaysSinceActivity: 30, maxDaysSinceActivity: 365, statuses: ["lost", "contacted"], serviceIds: [] };
  const eligibleAll = eligibleForCampaign(data, broadAudience, now);
  const sent = data.recipients.filter((r) => r.status !== "queued");
  const replies = data.recipients.filter((r) => r.reply).length;
  const recovered = data.recipients.filter((r) => r.status === "booked").length;

  return (
    <div className="pb-16">
      <PageHeader
        title="Reactivation"
        description={
          <>
            Bring back enquiries that went quiet. Messages are simulated in demo mode, nothing is sent. <DemoTag className="ml-1 align-middle" />
          </>
        }
      />
      <div className="grid gap-6 px-4 pt-5 sm:px-6">
        <section aria-label="Reactivation numbers" className="grid grid-cols-2 overflow-hidden rounded-[8px] border border-line bg-surface sm:grid-cols-4 xl:grid-cols-7">
          <Stat label="Old leads" value={oldLeads.length} hint="Quiet for 30+ days" />
          <Stat label="Eligible now" value={eligibleAll.length} hint="Consented, not yet contacted" />
          <Stat label="Campaign drafts" value={data.campaigns.filter((c) => c.status === "draft").length} />
          <Stat label="Active campaigns" value={data.campaigns.filter((c) => c.status === "active").length} />
          <Stat label="Replies" value={replies} hint={`from ${sent.length} messages`} />
          <Stat label="Recovered consultations" value={recovered} />
          <Stat label="Conversion rate" value={`${pct(recovered, sent.length).toFixed(1)}%`} hint="Booked ÷ messaged" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <CampaignBuilder />
          <section className="grid content-start gap-4">
            <h2 className="text-[16px] font-semibold">Campaigns</h2>
            {data.campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
            {data.campaigns.length === 0 && <p className="text-ink-2">No campaigns yet. Build one on the left.</p>}
          </section>
        </div>

        <section className="rounded-[8px] border border-line bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3.5">
            <h2 className="text-[16px] font-semibold">Eligible old leads</h2>
            <span className="text-[12.5px] text-ink-3">Quiet 30 to 365 days, consented, never messaged by a campaign</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="sticky top-0 bg-surface-2 text-[12px] text-ink-2">
                <tr>
                  <th className="px-5 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Interest</th>
                  <th className="px-3 py-2 font-medium max-sm:hidden">Status</th>
                  <th className="px-5 py-2 font-medium">Last activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {eligibleAll.map((l) => (
                  <tr key={l.id} className="hover:bg-surface-2">
                    <td className="px-5 py-2">
                      <Link href={`/app/inbox/${l.id}`} className="font-medium hover:underline">
                        {l.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-ink-2">{serviceName(data, l.serviceId)}</td>
                    <td className="px-3 py-2 text-ink-2 max-sm:hidden">{STATUS_LABEL[l.status]}</td>
                    <td className="px-5 py-2 text-ink-2 tabular">{shortDate(l.lastActivityAt, tz)}</td>
                  </tr>
                ))}
                {eligibleAll.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-6 text-ink-2">
                      Every eligible lead has already been included in a campaign.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="border-b border-r border-line px-4 py-3.5 last:border-r-0">
      <div className="text-[12px] font-medium text-ink-2">{label}</div>
      <div key={String(value)} className="rise board-type mt-1 text-[26px] font-semibold leading-none tabular">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-ink-3">{hint}</div>}
    </div>
  );
}

function CampaignBuilder() {
  const data = useClinicData();
  const now = useNow(10_000);
  const draftToEdit = data.campaigns.find((c) => c.status === "draft");
  const [editingId, setEditingId] = useState<string | undefined>(draftToEdit?.id);
  const base = data.campaigns.find((c) => c.id === editingId);
  const [name, setName] = useState(base?.name ?? "Quiet enquiries, last 6 months");
  const [message, setMessage] = useState(base?.message ?? DEFAULT_MESSAGE);
  const [audience, setAudience] = useState<CampaignAudience>(base?.audience ?? { minDaysSinceActivity: 30, maxDaysSinceActivity: 180, statuses: ["lost", "contacted"], serviceIds: [] });
  const [confirm, setConfirm] = useState(false);
  const store = useDemoStore.getState;

  const eligible = useMemo(() => eligibleForCampaign(data, audience, now), [data, audience, now]);
  const optedOut = data.leads.filter((l) => !l.consentToContact).length;
  const previewLead = eligible[0];
  const tooLong = message.length > 400;
  const missingStop = !/\bstop\b/i.test(message);

  function load(c: Campaign | undefined) {
    setEditingId(c?.id);
    setName(c?.name ?? "New reactivation campaign");
    setMessage(c?.message ?? DEFAULT_MESSAGE);
    setAudience(c?.audience ?? { minDaysSinceActivity: 30, maxDaysSinceActivity: 180, statuses: ["lost", "contacted"], serviceIds: [] });
    setConfirm(false);
  }

  function save() {
    const id = store().saveCampaign({ id: editingId, name, message, audience, channel: "whatsapp" });
    setEditingId(id);
    store().toast("Draft saved.", "info");
    return id;
  }

  function launch() {
    const id = save();
    store().launchCampaign(id);
    load(undefined);
  }

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const field = "h-9 w-full rounded-[6px] border border-line-strong bg-surface px-2.5 text-[13.5px] focus:border-ink focus:outline-none";
  const drafts = data.campaigns.filter((c) => c.status === "draft");

  return (
    <section className="rounded-[8px] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <h2 className="text-[16px] font-semibold">Campaign builder</h2>
        <div className="flex items-center gap-2">
          <label className="relative">
            <span className="sr-only">Load draft</span>
            <select className={clsx(field, "h-8 appearance-none pr-7 text-[12.5px]")} value={editingId ?? ""} onChange={(e) => load(data.campaigns.find((c) => c.id === e.target.value))}>
              <option value="">New campaign</option>
              {drafts.map((d) => (
                <option key={d.id} value={d.id}>
                  Draft: {d.name}
                </option>
              ))}
            </select>
            <CaretDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2" />
          </label>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <label className="grid gap-1.5">
          <span className="text-[13px] font-medium">Campaign name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-[13px] font-medium">Audience</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["lost", "contacted", "qualified"] as LeadStatus[]).map((s) => (
              <Chip key={s} on={audience.statuses.includes(s)} onClick={() => setAudience({ ...audience, statuses: toggle(audience.statuses, s) })}>
                {STATUS_LABEL[s]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip on={audience.serviceIds.length === 0} onClick={() => setAudience({ ...audience, serviceIds: [] })}>
              All services
            </Chip>
            {data.services.map((s) => (
              <Chip key={s.id} on={audience.serviceIds.includes(s.id)} onClick={() => setAudience({ ...audience, serviceIds: toggle(audience.serviceIds, s.id) })}>
                {s.name}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-[12.5px] text-ink-2">
              Quiet for at least (days)
              <input type="number" min={0} className={field} value={audience.minDaysSinceActivity} onChange={(e) => setAudience({ ...audience, minDaysSinceActivity: Number(e.target.value) })} />
            </label>
            <label className="grid gap-1 text-[12.5px] text-ink-2">
              and at most (days)
              <input type="number" min={1} className={field} value={audience.maxDaysSinceActivity} onChange={(e) => setAudience({ ...audience, maxDaysSinceActivity: Number(e.target.value) })} />
            </label>
          </div>
          <p className="flex items-start gap-2 rounded-[6px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              <strong className="font-semibold text-ink tabular">{eligible.length} leads</strong> match. {optedOut} opted-out contacts and anyone already messaged by a campaign are excluded automatically.
              A STOP reply opts the person out instantly.
            </span>
          </p>
        </fieldset>

        <label className="grid gap-1.5">
          <span className="flex items-baseline justify-between text-[13px] font-medium">
            Message <span className={clsx("text-[12px] font-normal tabular", tooLong ? "text-[var(--st-dnc)]" : "text-ink-3")}>{message.length}/400</span>
          </span>
          <textarea rows={4} className={clsx(field, "h-auto py-2 leading-relaxed")} value={message} onChange={(e) => setMessage(e.target.value)} />
          <span className="text-[12px] text-ink-3">
            Fields: {"{first_name}"}, {"{service}"}, {"{clinic_name}"}
          </span>
          {missingStop && <span className="text-[12.5px] font-medium text-[var(--st-human)]">Include an opt-out instruction such as &quot;Reply STOP to opt out&quot;.</span>}
        </label>

        <div>
          <div className="mb-2 text-[13px] font-medium">Preview</div>
          <div className="rounded-[8px] bg-surface-2 p-4">
            {previewLead ? (
              <>
                <div className="mb-2 text-[12px] text-ink-3">To {previewLead.name} · WhatsApp</div>
                <ChatBubble author="ai" kind="reminder" body={renderCampaignMessage(message, data, previewLead)} />
              </>
            ) : (
              <p className="text-[13px] text-ink-2">No one matches this audience yet. Widen the time range or services.</p>
            )}
          </div>
        </div>

        {confirm ? (
          <div className="grid gap-3 rounded-[6px] border border-ink p-4">
            <p className="text-[14px]">
              Send this message to <strong className="tabular">{eligible.length}</strong> leads? In demo mode replies are simulated over the next few seconds.
            </p>
            <div className="flex gap-2">
              <Button variant="signal" onClick={launch}>
                <PaperPlaneTilt className="size-4" weight="fill" /> Launch campaign
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setConfirm(true)} disabled={eligible.length === 0 || tooLong || missingStop || !name.trim()}>
              Review and launch
            </Button>
            <Button variant="secondary" onClick={save} disabled={!name.trim()}>
              Save draft
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={clsx("h-7 rounded-[6px] border px-2.5 text-[12.5px] transition-colors", on ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:border-ink-3")}
    >
      {children}
    </button>
  );
}

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const data = useClinicData();
  const now = useNow(5_000);
  const [open, setOpen] = useState(c.status !== "draft");
  const recs = data.recipients.filter((r) => r.campaignId === c.id);
  const counts = RECIPIENT_ORDER.map((s) => ({ s, n: recs.filter((r) => r.status === s).length })).filter((x) => x.n > 0);
  const deleteCampaign = useDemoStore((s) => s.deleteCampaign);

  return (
    <article className="rounded-[8px] border border-line bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-semibold">{c.name}</h3>
          <p className="text-[12.5px] text-ink-2">
            {c.status === "draft" ? `Draft · saved ${relativeTime(c.createdAt, now)}` : `${c.status === "active" ? "Running" : "Completed"} · launched ${relativeTime(c.launchedAt!, now)} · ${recs.length} messaged`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={clsx(
              "board-type rounded-[4px] px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.06em]",
              c.status === "active" ? "bg-signal text-ink" : c.status === "completed" ? "bg-ink text-white" : "bg-surface-3 text-ink-2",
            )}
          >
            {c.status}
          </span>
          {c.status === "draft" && (
            <button onClick={() => deleteCampaign(c.id)} className="grid size-7 place-items-center rounded-[4px] text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label={`Delete ${c.name}`}>
              <Trash className="size-4" />
            </button>
          )}
        </div>
      </header>

      {recs.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-[3px]" role="img" aria-label={counts.map((x) => `${RECIPIENT_LABEL[x.s]} ${x.n}`).join(", ")}>
            {counts.map((x) => (
              <span key={x.s} title={`${RECIPIENT_LABEL[x.s]}: ${x.n}`} style={{ flex: x.n, background: `var(--st-${RECIPIENT_TONE[x.s]})` }} />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-2">
            {counts.map((x) => (
              <li key={x.s} className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px]" style={{ background: `var(--st-${RECIPIENT_TONE[x.s]})` }} aria-hidden />
                {RECIPIENT_LABEL[x.s]} <span className="font-semibold text-ink tabular">{x.n}</span>
              </li>
            ))}
          </ul>
          <button onClick={() => setOpen((o) => !o)} className="mt-2 text-[12.5px] text-ink-2 underline underline-offset-4 hover:text-ink">
            {open ? "Hide replies" : "Show replies"}
          </button>
          {open && (
            <ul className="mt-2 grid max-h-64 gap-1 overflow-y-auto">
              {recs
                .filter((r) => r.reply || r.status === "booked")
                .map((r) => {
                  const lead = data.leads.find((l) => l.id === r.leadId);
                  return (
                    <li key={r.id} className="rise">
                      <Link href={`/app/inbox/${r.leadId}`} className="grid grid-cols-[1fr_auto] gap-2 rounded-[6px] px-2 py-1.5 hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium">{lead?.name}</span>
                          <span className="block truncate text-[12.5px] text-ink-2">&ldquo;{r.reply}&rdquo;</span>
                        </span>
                        <span className="self-center rounded-[4px] px-1.5 py-0.5 text-[11.5px] font-semibold" style={{ background: `var(--st-${RECIPIENT_TONE[r.status]}-wash)`, color: `var(--st-${RECIPIENT_TONE[r.status]})` }}>
                          {RECIPIENT_LABEL[r.status]}
                        </span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}
      {c.status === "draft" && <p className="border-t border-line px-4 py-3 text-[12.5px] leading-relaxed text-ink-2">{c.message}</p>}
    </article>
  );
}
