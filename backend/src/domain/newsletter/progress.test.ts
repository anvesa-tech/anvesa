import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isValidProgress } from './progress';

const RUNS = { numRuns: 100 };

describe('reading progress', () => {
  // Feature: anvesa-marketplace, Property 57: Reading-progress validation and round-trip
  it('Property 57: valid iff integer in [0,100]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 200 }), (pct) => {
        expect(isValidProgress(pct)).toBe(pct >= 0 && pct <= 100);
      }),
      RUNS,
    );
    // non-integers are invalid
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100, noNaN: true }).filter((x) => !Number.isInteger(x)), (pct) => {
        expect(isValidProgress(pct)).toBe(false);
      }),
      RUNS,
    );
  });
});
