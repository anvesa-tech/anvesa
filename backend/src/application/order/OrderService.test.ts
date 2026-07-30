import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { OrderService } from './OrderService';
import type {
  CreateOrderInput,
  OrderRecord,
  OrderRepository,
  OrderStatusEventRecord,
} from '../../domain/ports/repositories';

const RUNS = { numRuns: 100 };

/** In-memory OrderRepository fake. */
function fakeRepo() {
  const orders = new Map<string, OrderRecord>();
  const history = new Map<string, OrderStatusEventRecord[]>();
  let seq = 0;
  const repo: OrderRepository = {
    async create(input: CreateOrderInput) {
      const id = `o${(seq += 1)}`;
      const rec: OrderRecord = {
        id,
        userId: input.userId,
        status: 'PLACED',
        totalCents: input.totalCents,
        addressId: input.addressId,
        slotId: input.slotId,
        items: input.items,
        createdAt: new Date(2026, 0, 1, 0, 0, seq),
      };
      orders.set(id, rec);
      history.set(id, []);
      return rec;
    },
    async appendStatus(orderId, status, at) {
      history.get(orderId)?.push({ status, at });
      const o = orders.get(orderId);
      if (o) o.status = status;
    },
    async getById(orderId) {
      return orders.get(orderId) ?? null;
    },
    async getHistory(orderId) {
      return history.get(orderId) ?? [];
    },
    async listByUser(userId) {
      return [...orders.values()].filter((o) => o.userId === userId);
    },
  };
  return repo;
}

const baseInput: CreateOrderInput = {
  userId: 'u1',
  items: [{ variantId: 'v1', qty: 2, priceCents: 10000 }],
  subtotalCents: 20000,
  discountCents: 0,
  walletCents: 0,
  deliveryCents: 2000,
  totalCents: 22000,
  addressId: 'addr1',
  slotId: 'slot1',
};

describe('OrderService', () => {
  // Feature: anvesa-marketplace, Property 30: Order confirmation completeness
  it('Property 30: confirmation includes id, items, total, address, and slot', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.array(
          fc.record({
            variantId: fc.uuid(),
            qty: fc.integer({ min: 1, max: 10 }),
            priceCents: fc.integer({ min: 0, max: 100000 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (total, items) => {
          const svc = new OrderService(fakeRepo());
          const conf = await svc.create({ ...baseInput, items, totalCents: total }, new Date());
          expect(conf.id).toBeTruthy();
          expect(conf.items).toEqual(items);
          expect(conf.totalCents).toBe(total);
          expect(conf.addressId).toBe(baseInput.addressId);
          expect(conf.slotId).toBe(baseInput.slotId);
        },
      ),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 29: Order status history is chronologically ordered
  it('Property 29: tracking history is ordered earliest to latest', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 10_000_000 }), { minLength: 1, maxLength: 8 }),
        async (offsets) => {
          const repo = fakeRepo();
          const svc = new OrderService(repo);
          const conf = await svc.create(baseInput, new Date(1_000_000_000_000));
          // append status events at arbitrary times (bypassing transition rules)
          for (const off of offsets) {
            await repo.appendStatus(conf.id, 'CONFIRMED', new Date(1_000_000_000_000 + off));
          }
          const tracking = await svc.getTracking('u1', conf.id);
          expect(tracking.ok).toBe(true);
          if (tracking.ok) {
            const times = tracking.history.map((h) => h.at.getTime());
            const sorted = [...times].sort((a, b) => a - b);
            expect(times).toEqual(sorted);
          }
        },
      ),
      RUNS,
    );
  });

  it('rejects invalid status transitions and enforces tracking ownership', async () => {
    const svc = new OrderService(fakeRepo());
    const conf = await svc.create(baseInput, new Date());
    // PLACED -> DELIVERED is not allowed
    expect(await svc.transition(conf.id, 'DELIVERED', new Date())).toEqual({
      ok: false,
      error: 'INVALID_TRANSITION',
    });
    // PLACED -> CONFIRMED is allowed
    expect(await svc.transition(conf.id, 'CONFIRMED', new Date())).toEqual({ ok: true });
    // another user cannot track it
    expect(await svc.getTracking('someone-else', conf.id)).toEqual({
      ok: false,
      error: 'NOT_OWNER',
    });
  });
});
