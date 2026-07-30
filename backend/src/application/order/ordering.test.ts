import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { OrderService } from './OrderService';
import type { OrderRecord, OrderRepository } from '../../domain/ports/repositories';

const RUNS = { numRuns: 100 };

function repoWithOrders(records: OrderRecord[]): OrderRepository {
  return {
    async create() {
      throw new Error('unused');
    },
    async appendStatus() {},
    async getById() {
      return null;
    },
    async getHistory() {
      return [];
    },
    async listByUser() {
      return records;
    },
  };
}

describe('order list ordering', () => {
  // Feature: anvesa-marketplace, Property 26: Recency-descending ordering
  it('Property 26: orders are returned most-recent-first', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 0, max: 1_000_000_000 }), { minLength: 1, maxLength: 20 }),
        async (times) => {
          const records: OrderRecord[] = times.map((t, i) => ({
            id: `o${i}`,
            userId: 'u1',
            status: 'PLACED',
            totalCents: 100,
            addressId: 'a',
            slotId: null,
            items: [],
            createdAt: new Date(t),
          }));
          const svc = new OrderService(repoWithOrders(records));
          const list = await svc.listOrders('u1');
          for (let i = 1; i < list.length; i += 1) {
            const prev = records.find((r) => r.id === list[i - 1]!.id)!;
            const cur = records.find((r) => r.id === list[i]!.id)!;
            expect(prev.createdAt.getTime()).toBeGreaterThanOrEqual(cur.createdAt.getTime());
          }
        },
      ),
      RUNS,
    );
  });
});
