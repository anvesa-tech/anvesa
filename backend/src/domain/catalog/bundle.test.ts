import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { bundleAvailability, type BundleItem } from './bundle';

const RUNS = { numRuns: 100 };

const arbItem: fc.Arbitrary<BundleItem> = fc.record({
  productId: fc.uuid(),
  inStock: fc.boolean(),
});

describe('bundle availability', () => {
  // Feature: anvesa-marketplace, Property 38: Bundle add inserts exactly the in-stock subset
  it('Property 38: in-stock subset is exactly the in-stock items; partial flagged correctly', () => {
    fc.assert(
      fc.property(fc.array(arbItem, { minLength: 1, maxLength: 12 }), (items) => {
        const a = bundleAvailability(items);
        const expectedIn = items.filter((i) => i.inStock).map((i) => i.productId);
        const expectedOut = items.filter((i) => !i.inStock).map((i) => i.productId);
        expect(a.inStockProductIds).toEqual(expectedIn);
        expect(a.unavailableProductIds).toEqual(expectedOut);
        expect(a.fullyAvailable).toBe(expectedOut.length === 0);
        expect(a.partiallyAvailable).toBe(expectedOut.length > 0 && expectedIn.length > 0);
      }),
      RUNS,
    );
  });
});
