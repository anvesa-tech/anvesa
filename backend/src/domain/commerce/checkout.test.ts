import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { resolveCheckout } from './checkout';

const RUNS = { numRuns: 100 };

describe('checkout outcome resolver', () => {
  // Feature: anvesa-marketplace, Property 15: Confirmed payment creates an order and clears the cart
  it('Property 15: confirmed payment creates order and clears cart', () => {
    fc.assert(
      fc.property(fc.constant(true), (confirmed) => {
        const o = resolveCheckout(confirmed);
        expect(o.createOrder).toBe(true);
        expect(o.clearCart).toBe(true);
        expect(o.orderPlaced).toBe(true);
        expect(o.paymentRecordStatus).toBe('SUCCESS');
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 16: Unconfirmed payment preserves the cart and leaves the order unplaced
  it('Property 16: unconfirmed payment preserves cart, order unplaced, failed record', () => {
    fc.assert(
      fc.property(fc.constant(false), (confirmed) => {
        const o = resolveCheckout(confirmed);
        expect(o.createOrder).toBe(false);
        expect(o.preserveCart).toBe(true);
        expect(o.orderPlaced).toBe(false);
        expect(o.paymentRecordStatus).toBe('FAILED');
      }),
      RUNS,
    );
  });
});
