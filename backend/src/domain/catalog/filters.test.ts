import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  filterProducts,
  matchesFilter,
  matchesQuery,
  HEALTH_FILTERS,
  type FilterableProduct,
  type HealthFilter,
} from './filters';

const RUNS = { numRuns: 100 };

const arbProduct: fc.Arbitrary<FilterableProduct> = fc.record({
  name: fc.string({ minLength: 1, maxLength: 20 }),
  brand: fc.string({ minLength: 1, maxLength: 15 }),
  category: fc.constantFrom('breakfast', 'snacks', 'beverages', 'dairy'),
  nutrition: fc.record({
    energyKcal: fc.double({ min: 0, max: 900, noNaN: true }),
    sugarG: fc.double({ min: 0, max: 100, noNaN: true }),
    sodiumMg: fc.double({ min: 0, max: 3000, noNaN: true }),
    proteinG: fc.double({ min: 0, max: 100, noNaN: true }),
    fatG: fc.double({ min: 0, max: 100, noNaN: true }),
    satFatG: fc.double({ min: 0, max: 60, noNaN: true }),
    fibreG: fc.double({ min: 0, max: 60, noNaN: true }),
  }),
  ingredientNames: fc.array(fc.string({ maxLength: 12 }), { maxLength: 6 }),
});

describe('search & filters', () => {
  // Feature: anvesa-marketplace, Property 21: Search text matching is complete and sound
  it('Property 21: result set matches exactly the products containing the query', () => {
    fc.assert(
      fc.property(fc.array(arbProduct, { maxLength: 30 }), fc.string({ minLength: 1 }), (products, q) => {
        const result = filterProducts(products, q, []);
        for (const p of products) {
          const shouldMatch = matchesQuery(p, q);
          expect(result.includes(p)).toBe(shouldMatch);
        }
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 22: Empty or cleared queries return the unfiltered set
  it('Property 22: whitespace-only query and no filters returns all', () => {
    fc.assert(
      fc.property(fc.array(arbProduct, { maxLength: 30 }), fc.constantFrom('', '   ', '\t'), (products, q) => {
        expect(filterProducts(products, q, [])).toHaveLength(products.length);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 23: Applied filters are satisfied by every result (conjunction)
  it('Property 23: every result satisfies every applied filter', () => {
    fc.assert(
      fc.property(
        fc.array(arbProduct, { maxLength: 30 }),
        fc.uniqueArray(fc.constantFrom<HealthFilter>(...HEALTH_FILTERS), { maxLength: 4 }),
        (products, filters) => {
          const result = filterProducts(products, '', filters);
          for (const p of result) {
            for (const f of filters) expect(matchesFilter(p, f)).toBe(true);
          }
        },
      ),
      RUNS,
    );
  });
});
