import { checkoutTotal, couponDiscount } from '../../domain/commerce/coupon';
import { applyWallet } from '../../domain/commerce/wallet';
import { resolveCheckout } from '../../domain/commerce/checkout';
import type { PaymentGateway } from '../../domain/ports/gateways';
import type {
  AddressRepository,
  CartRepository,
  CartView,
  CouponRepository,
  OrderRepository,
  PaymentRepository,
  WalletRepository,
} from '../../domain/ports/repositories';

/** Delivery pricing is decided by the server, never the client (Requirement 16). */
const DELIVERY_FEE_CENTS = 3000;
const FREE_DELIVERY_THRESHOLD_CENTS = 50000;

export interface CheckoutParams {
  userId: string;
  addressId: string;
  slotId: string;
  couponCode?: string | undefined;
  useWallet?: boolean | undefined;
  payment: { orderId: string; paymentId: string; signature: string };
}

export interface QuoteParams {
  userId: string;
  addressId?: string | undefined;
  couponCode?: string | undefined;
  useWallet?: boolean | undefined;
}

export type CheckoutError = 'EMPTY_CART' | 'PAYMENT_FAILED' | 'INVALID_ADDRESS' | 'INVALID_COUPON';

interface Quote {
  cart: CartView;
  subtotalCents: number;
  discountCents: number;
  deliveryCents: number;
  walletCents: number;
  totalCents: number;
  appliedCouponCode: string | null;
}

export type CheckoutResult =
  | { ok: true; orderId: string; totalCents: number }
  | { ok: false; error: CheckoutError };

export type PaymentOrderResult =
  | { ok: true; razorpayOrderId: string; amountCents: number; currency: 'INR' }
  | { ok: false; error: CheckoutError };

/**
 * Checkout_Service (Requirement 16, 17). All pricing is computed server-side
 * from trusted sources — cart subtotal, a validated coupon, the real wallet
 * balance, and a server-decided delivery fee. Client-supplied amounts are never
 * trusted, and the delivery address must belong to the ordering user.
 */
export class CheckoutService {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly payments: PaymentRepository,
    private readonly gateway: PaymentGateway,
    private readonly coupons: CouponRepository,
    private readonly wallet: WalletRepository,
    private readonly addresses: AddressRepository,
  ) {}

  /** Compute the authoritative, server-side price breakdown for the user's cart. */
  private async quote(params: QuoteParams, now: Date): Promise<{ ok: true; quote: Quote } | { ok: false; error: CheckoutError }> {
    const cart = await this.carts.getCart(params.userId);
    if (cart.lines.length === 0) return { ok: false, error: 'EMPTY_CART' };

    if (params.addressId) {
      const owner = await this.addresses.ownerOf(params.addressId);
      if (owner && owner !== params.userId) return { ok: false, error: 'INVALID_ADDRESS' };
    }

    const subtotalCents = cart.subtotalCents;

    let discountCents = 0;
    let appliedCouponCode: string | null = null;
    if (params.couponCode) {
      const c = await this.coupons.findByCode(params.couponCode);
      const eligible =
        c &&
        c.isActive &&
        c.expiresAt.getTime() >= now.getTime() &&
        c.usedCount < c.usageLimit &&
        subtotalCents >= c.minOrderCents;
      if (!eligible) return { ok: false, error: 'INVALID_COUPON' };
      discountCents = couponDiscount(subtotalCents, {
        type: c.type,
        value: c.value,
        minOrderCents: c.minOrderCents,
      });
      appliedCouponCode = c.code;
    }

    const deliveryCents = subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS ? 0 : DELIVERY_FEE_CENTS;

    let walletCents = 0;
    if (params.useWallet) {
      const balance = await this.wallet.getBalance(params.userId);
      const outstanding = Math.max(0, subtotalCents - discountCents + deliveryCents);
      if (balance > 0 && outstanding > 0) {
        const applied = applyWallet(balance, Math.min(balance, outstanding), outstanding);
        if (applied.ok) walletCents = applied.appliedCents;
      }
    }

    const totalCents = checkoutTotal({
      subtotalCents,
      couponDiscountCents: discountCents,
      walletCents,
      deliveryCents,
    });

    return {
      ok: true,
      quote: { cart, subtotalCents, discountCents, deliveryCents, walletCents, totalCents, appliedCouponCode },
    };
  }

  /**
   * Create a Razorpay order for the server-computed total (Requirement 17.1).
   * The client opens Razorpay Checkout with the returned order id, then calls
   * `place` with the returned payment credentials.
   */
  async createPaymentOrder(params: QuoteParams, now: Date): Promise<PaymentOrderResult> {
    const q = await this.quote(params, now);
    if (!q.ok) return q;
    const receipt = `rcpt_${Date.now()}`;
    const { providerOrderId } = await this.gateway.createOrder(q.quote.totalCents, receipt);
    return { ok: true, razorpayOrderId: providerOrderId, amountCents: q.quote.totalCents, currency: 'INR' };
  }

  /** Verify payment and, on success, create the order and clear the cart. */
  async place(params: CheckoutParams, now: Date): Promise<CheckoutResult> {
    const q = await this.quote(params, now);
    if (!q.ok) return q;
    const { cart, subtotalCents, discountCents, deliveryCents, walletCents, totalCents, appliedCouponCode } = q.quote;

    const confirmed = await this.gateway.verifySignature(params.payment);
    const outcome = resolveCheckout(confirmed);
    if (!outcome.createOrder) {
      await this.payments.record({
        orderId: null,
        amountCents: totalCents,
        status: 'FAILED',
        razorpayRef: params.payment.paymentId,
        signature: params.payment.signature,
      });
      return { ok: false, error: 'PAYMENT_FAILED' };
    }

    const order = await this.orders.create({
      userId: params.userId,
      items: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty, priceCents: l.priceCents })),
      subtotalCents,
      discountCents,
      walletCents,
      deliveryCents,
      totalCents,
      addressId: params.addressId,
      slotId: params.slotId,
    });
    await this.orders.appendStatus(order.id, 'PLACED', now);
    await this.payments.record({
      orderId: order.id,
      amountCents: totalCents,
      status: 'SUCCESS',
      razorpayRef: params.payment.paymentId,
      signature: params.payment.signature,
    });

    if (walletCents > 0) await this.wallet.applyDebit(params.userId, walletCents, `order:${order.id}`);
    if (appliedCouponCode) await this.coupons.incrementUsage(appliedCouponCode);
    await this.carts.clear(params.userId);
    return { ok: true, orderId: order.id, totalCents };
  }
}
