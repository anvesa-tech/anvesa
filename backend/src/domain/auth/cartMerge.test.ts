import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeGuestCart, type MergeLine } from './cartMerge';

const RUNS = { numRuns: 100 };

const arbLine: fc.Arbitrary<MergeLine> = fc.record({
  variantId: fc.constantFrom('v1', 'v2', 'v3', 'v4'),
  qty: fc.integer({ min: 1, max: 20 }),
});

describe('guest cart merge', () => {
  // Feature: anvesa-marketplace, Property 48: Guest cart merge keeps the higher quantity
  it('Property 48: for variants in both carts, the higher quantity is retained', () => {
    fc.assert(
      fc.property(fc.array(arbLine, { maxLength: 8 }), fc.array(arbLine, { maxLength: 8 }), (account, guest) => {
        // De-dup inputs by variant (a cart holds one line per variant).
        const dedup = (lines: MergeLine[]) => {
          const m = new Map<string, number>();
          for (const l of lines) m.set(l.variantId, l.qty);
          return [...m.entries()].map(([variantId, qty]) => ({ variantId, qty }));
        };
        const a = dedup(account);
        const g = dedup(guest);
        const merged = mergeGuestCart(a, g);
        const mergedMap = new Map(merged.map((l) => [l.variantId, l.qty]));

        const aMap = new Map(a.map((l) => [l.variantId, l.qty]));
        const gMap = new Map(g.map((l) => [l.variantId, l.qty]));
        const allVariants = new Set([...aMap.keys(), ...gMap.keys()]);
        for (const v of allVariants) {
          const expected = Math.max(aMap.get(v) ?? 0, gMap.get(v) ?? 0);
          expect(mergedMap.get(v)).toBe(expected);
        }
        expect(merged.length).toBe(allVariants.size);
      }),
      RUNS,
    );
  });
});
