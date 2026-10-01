import type { Channel } from "@/lib/domain/types";

export interface OutboundMessage {
  clinicId: string;
  leadId: string;
  channel: Channel;
  to: string;
  body: string;
  /** WhatsApp requires approved templates outside the 24h service window. */
  templateName?: string;
}

export interface DeliveryResult {
  status: "simulated" | "queued" | "sent" | "failed";
  providerMessageId?: string;
  error?: string;
}

/**
 * Every outbound patient message goes through a MessagingProvider.
 * Demo mode uses `SimulatedMessaging`, which records the message and sends nothing.
 */
export interface MessagingProvider {
  readonly channel: Channel;
  readonly live: boolean;
  send(msg: OutboundMessage): Promise<DeliveryResult>;
}

export class SimulatedMessaging implements MessagingProvider {
  readonly live = false;
  constructor(readonly channel: Channel) {}
  async send(): Promise<DeliveryResult> {
    return { status: "simulated", providerMessageId: `sim_${Math.random().toString(36).slice(2, 10)}` };
  }
}

/**
 * Production adapters are intentionally not implemented in the MVP. Each one
 * needs the listed server-side credentials, consent records and (for WhatsApp)
 * approved message templates before it can be enabled.
 *
 * - WhatsApp Cloud API: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, webhook verify token
 * - SMS (e.g. MSG91 / Twilio): SMS_API_KEY, DLT-registered sender ID and templates (India)
 * - Email (e.g. Postmark / SES): EMAIL_API_KEY, verified sending domain
 */
export class NotConfiguredMessaging implements MessagingProvider {
  readonly live = true;
  constructor(readonly channel: Channel) {}
  async send(): Promise<DeliveryResult> {
    return { status: "failed", error: `${this.channel} provider is not configured` };
  }
}

export function getMessagingProvider(channel: Channel): MessagingProvider {
  // Real sending is never enabled from the browser, and never in demo mode.
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "false") return new SimulatedMessaging(channel);
  return new NotConfiguredMessaging(channel);
}
