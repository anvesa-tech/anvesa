import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { nextStreak, shouldAwardScan, dayDiff } from './streak';

const RUNS = { numRuns: 100 };

/** Build a UTC day string offset by `n` days from a base epoch. */
function day(n: number): string {
  const d = new Date(Date.UTC(2026, 0, 1) + n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

describe('streak logic', () => {
  // Feature: anvesa-marketplace, Property 32: Consecutive-day streak logic
  it('Property 32: next-day increments, same-day no-op, gap resets', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 10 }),
        fc.integer({ min: 1, max: 50 }),
        (base, gap, current) => {
          const last = day(base);
          const today = day(base + gap);
          const result = nextStreak(last, today, current);
          if (gap === 0) expect(result).toBe(current);
          else if (gap === 1) expect(result).toBe(current + 1);
          else expect(result).toBe(1);
        },
      ),
      RUNS,
    );
  });

  it('no prior activity starts a streak of 1', () => {
    expect(nextStreak(null, day(5), 0)).toBe(1);
  });

  it('dayDiff counts calendar days', () => {
    expect(dayDiff(day(0), day(3))).toBe(3);
  });

  // Feature: anvesa-marketplace, Property 31: Scan reward is granted exactly once per product per UTC day
  it('Property 31: award only when not already rewarded today', () => {
    fc.assert(
      fc.property(fc.boolean(), (already) => {
        expect(shouldAwardScan(already)).toBe(!already);
      }),
      RUNS,
    );
  });
});
