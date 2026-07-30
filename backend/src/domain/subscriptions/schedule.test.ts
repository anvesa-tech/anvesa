import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { advanceSchedule, shouldGenerate, type SubStatus } from './schedule';

const RUNS = { numRuns: 100 };
const DAY = 86_400_000;

describe('subscription schedule', () => {
  // Feature: anvesa-marketplace, Property 36: Due active subscriptions generate an order and advance by two days
  it('Property 36: active + due generates, and advance adds exactly 2 days', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1e12 }), fc.integer({ min: 0, max: 1e12 }), (next, now) => {
        expect(shouldGenerate('ACTIVE', next, now)).toBe(next <= now);
        expect(advanceSchedule(next)).toBe(next + 2 * DAY);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 37: Non-active subscriptions never generate orders
  it('Property 37: paused/cancelled never generate regardless of date', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SubStatus>('PAUSED', 'CANCELLED'),
        fc.integer({ min: 0, max: 1e12 }),
        fc.integer({ min: 0, max: 1e12 }),
        (status, next, now) => {
          expect(shouldGenerate(status, next, now)).toBe(false);
        },
      ),
      RUNS,
    );
  });
});
