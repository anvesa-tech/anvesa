/**
 * Pure coupon and checkout-total math (Requirement 14.1, 16.2). No I/O.
 */

export type CouponType = 'PERCENT' | 'FLAT';

export interface CouponSpec {
  type: CouponType;
  /** percent (0..100) when PERCENT; absolute cents when FLAT. */
  value: number;
  minOrderCents: number;
}

/**
 * Compute the coupon discount for a subtotal. The discount is always capped at
 * the subtotal so the order total can never go below zero (Requirement 14.1).
 * Returns 0 when the minimum-order condition is not met.
 */
export function couponDiscount(subtotalCents: number, coupon: CouponSpec): number {
  if (subtotalCents < coupon.minOrderCents) return 0;
  const raw =
    coupon.type === 'PERCENT'
      ? Math.floor((subtotalCents * Math.min(Math.max(coupon.value, 0), 100)) / 100)
      : Math.max(coupon.value, 0);
  return Math.min(raw, subtotalCents);
}

/**
 * Final order total (Requirement 16.2):
 *   max(0, subtotal − couponDiscount − wallet + delivery).
 */
export function checkoutTotal(params: {
  subtotalCents: number;
  couponDiscountCents: number;
  walletCents: number;
  deliveryCents: number;
}): number {
  const { subtotalCents, couponDiscountCents, walletCents, deliveryCents } = params;
  return Math.max(0, subtotalCents - couponDiscountCents - walletCents + deliveryCents);
}
