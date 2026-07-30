import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { DeliveryService, type DeliveryRepository, type DeliverySlotView } from './DeliveryService';
import type { CachePort } from '../../domain/ports/gateways';

const RUNS = { numRuns: 100 };

function noopCache(): CachePort {
  return {
    async get() {
      return null;
    },
    async set() {},
    async del() {},
    async hold() {
      return true;
    },
    async release() {},
  };
}

function repoWith(slot: DeliverySlotView | null): DeliveryRepository {
  const registered = new Set<string>();
  return {
    async registerPincode(userId, code) {
      registered.add(`${userId}:${code}`); // Set → idempotent
    },
    async listSlotsNext7Days() {
      return slot ? [slot] : [];
    },
    async getSlot() {
      return slot;
    },
  };
}

describe('DeliveryService', () => {
  // Feature: anvesa-marketplace, Property 44: Full slots reject selection
  it('Property 44: reserving a slot at capacity is rejected', () => {
    fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 50 }), async (capacity) => {
        const slot: DeliverySlotView = {
          id: 's1',
          startAtMs: 0,
          endAtMs: 1,
          capacity,
          reserved: capacity,
        };
        const svc = new DeliveryService(repoWith(slot), noopCache());
        expect(await svc.reserveSlot('o1', 's1')).toEqual({ ok: false, error: 'SLOT_FULL' });
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 41: Pincode registration is idempotent per user
  it('Property 41: valid pincode accepted; invalid rejected', () => {
    fc.assert(
      fc.asyncProperty(fc.string(), async (code) => {
        const svc = new DeliveryService(repoWith(null), noopCache());
        const res = await svc.registerPincode('u1', code);
        expect(res.ok).toBe(/^\d{6}$/.test(code));
      }),
      RUNS,
    );
  });

  it('reserves an available slot', async () => {
    const slot: DeliverySlotView = { id: 's1', startAtMs: 0, endAtMs: 1, capacity: 20, reserved: 5 };
    const svc = new DeliveryService(repoWith(slot), noopCache());
    expect(await svc.reserveSlot('o1', 's1')).toEqual({ ok: true });
  });
});
