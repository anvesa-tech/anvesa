import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isValidTransition, ORDER_STATUSES, type OrderStatus } from './statusMachine';

const RUNS = { numRuns: 100 };
const arbStatus = fc.constantFrom<OrderStatus>(...ORDER_STATUSES);

const ALLOWED = new Set<string>([
  'PLACED>CONFIRMED',
  'PLACED>CANCELLED',
  'CONFIRMED>PACKED',
  'CONFIRMED>CANCELLED',
  'PACKED>OUT_FOR_DELIVERY',
  'PACKED>CANCELLED',
  'OUT_FOR_DELIVERY>DELIVERED',
]);

describe('order status machine', () => {
  // Feature: anvesa-marketplace, Property 59: Order-status transition validity
  it('Property 59: transition accepted iff it is an allowed edge', () => {
    fc.assert(
      fc.property(arbStatus, arbStatus, (from, to) => {
        expect(isValidTransition(from, to)).toBe(ALLOWED.has(`${from}>${to}`));
      }),
      RUNS,
    );
  });

  it('terminal states allow no transitions', () => {
    for (const to of ORDER_STATUSES) {
      expect(isValidTransition('DELIVERED', to)).toBe(false);
      expect(isValidTransition('CANCELLED', to)).toBe(false);
    }
  });
});
