import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { checkoutTotal, couponDiscount, type CouponSpec } from './coupon';

const RUNS = { numRuns: 100 };

const arbCoupon: fc.Arbitrary<CouponSpec> = fc.oneof(
  fc.record({
    type: fc.constant<'PERCENT'>('PERCENT'),
    value: fc.integer({ min: 0, max: 100 }),
    minOrderCents: fc.integer({ min: 0, max: 200_000 }),
  }),
  fc.record({
    type: fc.constant<'FLAT'>('FLAT'),
    value: fc.integer({ min: 0, max: 500_000 }),
    minOrderCents: fc.integer({ min: 0, max: 200_000 }),
  }),
);

describe('coupon & checkout math', () => {
  // Feature: anvesa-marketplace, Property 8: Coupon discount is capped and never drives totals negative
  it('Property 8: discount never exceeds subtotal', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), arbCoupon, (subtotal, coupon) => {
        const d = couponDiscount(subtotal, coupon);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(subtotal);
        expect(subtotal - d).toBeGreaterThanOrEqual(0);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 14: Checkout total formula with zero floor
  it('Property 14: total = max(0, subtotal - coupon - wallet + delivery)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        (subtotalCents, couponDiscountCents, walletCents, deliveryCents) => {
          const total = checkoutTotal({
            subtotalCents,
            couponDiscountCents,
            walletCents,
            deliveryCents,
          });
          const expected = Math.max(
            0,
            subtotalCents - couponDiscountCents - walletCents + deliveryCents,
          );
          expect(total).toBe(expected);
          expect(total).toBeGreaterThanOrEqual(0);
        },
      ),
      RUNS,
    );
  });
});
