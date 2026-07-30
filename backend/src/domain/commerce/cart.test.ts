import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { cartTotal, validateQty, type CartLine } from './cart';

const RUNS = { numRuns: 100 };

const arbLine: fc.Arbitrary<CartLine> = fc.record({
  variantId: fc.uuid(),
  priceCents: fc.integer({ min: 0, max: 500_000 }),
  qty: fc.integer({ min: 1, max: 20 }),
});

describe('cart math', () => {
  // Feature: anvesa-marketplace, Property 6: Cart total invariant
  it('Property 6: cart total equals sum of price x qty', () => {
    fc.assert(
      fc.property(fc.array(arbLine, { maxLength: 30 }), (lines) => {
        const expected = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
        expect(cartTotal(lines)).toBe(expected);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 7: Invalid cart quantities are rejected without mutating the cart
  it('Property 7: qty < 1 or > stock is rejected; valid qty accepted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -5, max: 50 }),
        fc.integer({ min: 0, max: 30 }),
        (qty, stock) => {
          const res = validateQty(qty, stock);
          if (qty < 1) {
            expect(res).toEqual({ ok: false, reason: 'below_min' });
          } else if (qty > stock) {
            expect(res).toEqual({ ok: false, reason: 'out_of_stock' });
          } else {
            expect(res).toEqual({ ok: true, qty });
          }
        },
      ),
      RUNS,
    );
  });
});
