import { couponDiscount } from '../../domain/commerce/coupon';
import type { CouponRepository } from '../../domain/ports/repositories';

export type CouponError =
  | 'INVALID_COUPON'
  | 'COUPON_INELIGIBLE'
  | 'MIN_ORDER_NOT_MET'
  | 'SINGLE_COUPON_PER_ORDER';

export type ApplyResult =
  | { ok: true; code: string; discountCents: number; totalCents: number }
  | { ok: false; error: CouponError };

/**
 * Coupon_Service (Requirement 14). Validates existence, active, not-expired,
 * usage limit, minimum-order, and single-coupon-per-order, then computes a
 * discount capped at the subtotal. `now` is injected for determinism/testing.
 */
export class CouponService {
  constructor(private readonly coupons: CouponRepository) {}

  async apply(
    subtotalCents: number,
    code: string,
    now: Date,
    alreadyAppliedCode: string | null = null,
  ): Promise<ApplyResult> {
    if (alreadyAppliedCode && alreadyAppliedCode !== code) {
      return { ok: false, error: 'SINGLE_COUPON_PER_ORDER' };
    }
    const c = await this.coupons.findByCode(code);
    if (!c) return { ok: false, error: 'INVALID_COUPON' };
    if (!c.isActive || c.expiresAt.getTime() < now.getTime() || c.usedCount >= c.usageLimit) {
      return { ok: false, error: 'COUPON_INELIGIBLE' };
    }
    if (subtotalCents < c.minOrderCents) {
      return { ok: false, error: 'MIN_ORDER_NOT_MET' };
    }
    const discountCents = couponDiscount(subtotalCents, {
      type: c.type,
      value: c.value,
      minOrderCents: c.minOrderCents,
    });
    return { ok: true, code: c.code, discountCents, totalCents: subtotalCents - discountCents };
  }

  /** Removing a coupon restores the order total to the bare subtotal. */
  remove(subtotalCents: number): { totalCents: number } {
    return { totalCents: subtotalCents };
  }
}
