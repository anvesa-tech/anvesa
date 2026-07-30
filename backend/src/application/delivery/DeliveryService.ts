import { isServiceable, isValidPincode } from '../../domain/delivery/geo';
import type { CachePort } from '../../domain/ports/gateways';

export interface DeliverySlotView {
  id: string;
  startAtMs: number;
  endAtMs: number;
  capacity: number;
  reserved: number;
}

export interface DeliveryRepository {
  registerPincode(userId: string, code: string): Promise<void>; // idempotent (unique userId+code)
  listSlotsNext7Days(nowMs: number): Promise<DeliverySlotView[]>;
  getSlot(slotId: string): Promise<DeliverySlotView | null>;
}

const SLOT_HOLD_SEC = 10 * 60;

export type ZoneResult = { serviceable: true } | { serviceable: false };
export type PincodeResult = { ok: true } | { ok: false; error: 'INVALID_PINCODE' };
export type ReserveResult = { ok: true } | { ok: false; error: 'SLOT_FULL' | 'NOT_FOUND' };

/**
 * Delivery_Service (Requirement 18, 19). Zone check via the pure geofence,
 * 6-digit pincode validation with idempotent registration, 7-day slot listing,
 * and a 10-minute slot hold implemented with a Redis TTL key.
 */
export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly cache: CachePort,
  ) {}

  checkZone(point: { lat: number; lng: number }): ZoneResult {
    return isServiceable(point) ? { serviceable: true } : { serviceable: false };
  }

  async registerPincode(userId: string, code: string): Promise<PincodeResult> {
    if (!isValidPincode(code)) return { ok: false, error: 'INVALID_PINCODE' };
    await this.repo.registerPincode(userId, code);
    return { ok: true };
  }

  getSlots(nowMs: number): Promise<DeliverySlotView[]> {
    return this.repo.listSlotsNext7Days(nowMs);
  }

  /** Reserve a slot for 10 minutes; rejects a slot at capacity. */
  async reserveSlot(orderId: string, slotId: string): Promise<ReserveResult> {
    const slot = await this.repo.getSlot(slotId);
    if (!slot) return { ok: false, error: 'NOT_FOUND' };
    if (slot.reserved >= slot.capacity) return { ok: false, error: 'SLOT_FULL' };
    await this.cache.hold(`slot:${slotId}:${orderId}`, SLOT_HOLD_SEC);
    return { ok: true };
  }
}
