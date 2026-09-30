import { isSlotStillOpen, listOpenSlots, type AvailabilityInput } from "@/lib/booking/availability";
import type { SlotRef } from "@/lib/domain/types";

export interface BookingRequest {
  clinicId: string;
  leadId: string;
  serviceId?: string;
  slot: SlotRef;
}

export type BookingResult = { ok: true; externalId?: string } | { ok: false; reason: "slot_taken" | "provider_error"; message: string };

/**
 * Where availability comes from and where appointments are written.
 * The MVP ships `InternalBooking`, computed from clinic settings and
 * ConsultFlow's own appointments. A practice-management or calendar
 * integration (e.g. a PMS API or Google Calendar) implements the same interface.
 */
export interface BookingProvider {
  readonly name: string;
  openSlots(input: AvailabilityInput): SlotRef[];
  book(req: BookingRequest, input: AvailabilityInput): Promise<BookingResult>;
}

export class InternalBooking implements BookingProvider {
  readonly name = "internal-demo";
  openSlots(input: AvailabilityInput) {
    return listOpenSlots(input);
  }
  async book(req: BookingRequest, input: AvailabilityInput): Promise<BookingResult> {
    if (!isSlotStillOpen(req.slot, input)) {
      return { ok: false, reason: "slot_taken", message: "That time was just taken." };
    }
    return { ok: true };
  }
}

export const bookingProvider: BookingProvider = new InternalBooking();
