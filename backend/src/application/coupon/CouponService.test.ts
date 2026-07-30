import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { CouponService } from './CouponService';
import type { CouponRepository } from '../../domain/ports/repositories';

const RUNS = { numRuns: 100 };
const NOW = new Date('2026-06-01T00:00:00Z');

type CouponRow = NonNullable<Awaited<ReturnType<CouponRepository['findByCode']>>>;

function repoWith(coupon: CouponRow | null): CouponRepository {
  return {
    async findByCode(code) {
      return coupon && coupon.code === code ? coupon : null;
    },
    async incrementUsage() {
      /* no-op */
    },
  };
}

const validCoupon: CouponRow = {
  code: 'CLEAN10',
  type: 'PERCENT',
  value: 10,
  minOrderCents: 10000,
  usageLimit: 100,
  usedCount: 0,
  expiresAt: new Date('2027-01-01T00:00:00Z'),
  isActive: true,
};

describe('CouponService', () => {
  // Feature: anvesa-marketplace, Property 9: Ineligible coupons are rejected
  it('Property 9: nonexistent/inactive/expired/used-up/below-min are rejected, total unchanged', () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.oneof(
          fc.constant<'missing'>('missing'),
          fc.constant<'inactive'>('inactive'),
          fc.constant<'expired'>('expired'),
          fc.constant<'usedup'>('usedup'),
          fc.constant<'belowmin'>('belowmin'),
        ),
        async (subtotal, kind) => {
          let row: CouponRow | null = { ...validCoupon };
          if (kind === 'missing') row = null;
          else if (kind === 'inactive') row = { ...validCoupon, isActive: false };
          else if (kind === 'expired')
            row = { ...validCoupon, expiresAt: new Date('2020-01-01T00:00:00Z') };
          else if (kind === 'usedup') row = { ...validCoupon, usedCount: 100 };
          else if (kind === 'belowmin') row = { ...validCoupon, minOrderCents: subtotal + 1 };

          const svc = new CouponService(repoWith(row));
          const res = await svc.apply(subtotal, 'CLEAN10', NOW);
          expect(res.ok).toBe(false);
        },
      ),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 10: Coupon apply/remove round-trip restores the total
  it('Property 10: apply then remove restores the original subtotal', () => {
    fc.assert(
      fc.asyncProperty(fc.integer({ min: 10000, max: 1_000_000 }), async (subtotal) => {
        const svc = new CouponService(repoWith({ ...validCoupon }));
        const applied = await svc.apply(subtotal, 'CLEAN10', NOW);
        expect(applied.ok).toBe(true);
        if (applied.ok) {
          expect(applied.totalCents).toBeLessThanOrEqual(subtotal);
          const removed = svc.remove(subtotal);
          expect(removed.totalCents).toBe(subtotal);
        }
      }),
      RUNS,
    );
  });

  it('single-coupon-per-order: applying a different code while one is applied is rejected', async () => {
    const svc = new CouponService(repoWith({ ...validCoupon }));
    const res = await svc.apply(50000, 'OTHER', NOW, 'CLEAN10');
    expect(res).toEqual({ ok: false, error: 'SINGLE_COUPON_PER_ORDER' });
  });
});
