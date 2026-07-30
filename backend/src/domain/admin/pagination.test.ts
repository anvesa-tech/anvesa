import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { clampPageSize, ADMIN_DEFAULT_PAGE_SIZE } from './pagination';

const RUNS = { numRuns: 100 };

describe('admin pagination clamp', () => {
  // Feature: anvesa-marketplace, Property 28: Admin page size is clamped
  it('Property 28: clamped to [1,50], default 20 when unspecified', () => {
    expect(clampPageSize(undefined)).toBe(ADMIN_DEFAULT_PAGE_SIZE);
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 1000 }), (req) => {
        const eff = clampPageSize(req);
        expect(eff).toBeGreaterThanOrEqual(1);
        expect(eff).toBeLessThanOrEqual(50);
        if (req >= 1 && req <= 50) expect(eff).toBe(Math.floor(req));
      }),
      RUNS,
    );
  });
});
