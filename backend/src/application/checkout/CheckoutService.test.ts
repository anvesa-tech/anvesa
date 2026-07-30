import { describe, expect, it } from 'vitest';
import { CheckoutService } from './CheckoutService';
import type {
  AddressRepository,
  CartRepository,
  CartView,
  CouponRepository,
  OrderRepository,
  PaymentRepository,
  WalletRepository,
} from '../../domain/ports/repositories';
import type { PaymentGateway } from '../../domain/ports/gateways';

interface FakeOpts {
  confirmed: boolean;
  cart: CartView;
  balance?: number;
  coupon?: {
    code: string;
    type: 'PERCENT' | 'FLAT';
    value: number;
    minOrderCents: number;
    usageLimit: number;
    usedCount: number;
    expiresAt: Date;
    isActive: boolean;
  } | null;
  addressOwner?: string | null;
}

function fakes(opts: FakeOpts) {
  const cleared = { value: false };
  const created: string[] = [];
  const payments: string[] = [];
  const debits: number[] = [];
  const couponUses: string[] = [];

  const carts: CartRepository = {
    async getCart() {
      return opts.cart;
    },
    async getVariantStock() {
      return 100;
    },
    async upsertItem() {},
    async incrementItem() {},
    async removeItem() {},
    async clear() {
      cleared.value = true;
    },
    async bundleInStockVariants() {
      return [];
    },
  };
  const orders: OrderRepository = {
    async create(input) {
      created.push('o1');
      return {
        id: 'o1',
        userId: input.userId,
        status: 'PLACED',
        totalCents: input.totalCents,
        addressId: input.addressId,
        slotId: input.slotId,
        items: input.items,
        createdAt: new Date(),
      };
    },
    async appendStatus() {},
    async getById() {
      return null;
    },
    async getHistory() {
      return [];
    },
    async listByUser() {
      return [];
    },
  };
  const paymentRepo: PaymentRepository = {
    async record(p) {
      payments.push(p.status);
    },
  };
  const gateway: PaymentGateway = {
    async createOrder() {
      return { providerOrderId: 'rzp1' };
    },
    async verifySignature() {
      return opts.confirmed;
    },
  };
  const coupons: CouponRepository = {
    async findByCode() {
      return opts.coupon ?? null;
    },
    async incrementUsage(code) {
      couponUses.push(code);
    },
  };
  const wallet: WalletRepository = {
    async getBalance() {
      return opts.balance ?? 0;
    },
    async applyDebit(_userId, amountCents) {
      debits.push(amountCents);
    },
    async applyCredit() {},
  };
  const addresses: AddressRepository = {
    async ownerOf() {
      return opts.addressOwner ?? null;
    },
  };
  return { carts, orders, paymentRepo, gateway, coupons, wallet, addresses, cleared, created, payments, debits, couponUses };
}

const cart: CartView = {
  ownerId: 'u1',
  lines: [{ itemId: 'i1', variantId: 'v1', productName: 'Oats', priceCents: 21000, qty: 2, stock: 100 }],
  subtotalCents: 42000,
};

const baseParams = {
  userId: 'u1',
  addressId: 'a1',
  slotId: 's1',
  payment: { orderId: 'rzp1', paymentId: 'pay1', signature: 'sig' },
};

function build(opts: FakeOpts) {
  const f = fakes(opts);
  const svc = new CheckoutService(
    f.carts,
    f.orders,
    f.paymentRepo,
    f.gateway,
    f.coupons,
    f.wallet,
    f.addresses,
  );
  return { f, svc };
}

describe('CheckoutService orchestration', () => {
  it('confirmed payment: server adds delivery, creates order, records SUCCESS, clears cart', async () => {
    const { f, svc } = build({ confirmed: true, cart });
    const res = await svc.place(baseParams, new Date());
    // 42000 subtotal + 3000 delivery (below free-delivery threshold), no coupon/wallet.
    expect(res).toEqual({ ok: true, orderId: 'o1', totalCents: 45000 });
    expect(f.created).toHaveLength(1);
    expect(f.payments).toContain('SUCCESS');
    expect(f.cleared.value).toBe(true);
  });

  it('ignores client pricing and computes the coupon discount server-side', async () => {
    const { f, svc } = build({
      confirmed: true,
      cart,
      coupon: {
        code: 'SAVE10',
        type: 'PERCENT',
        value: 10,
        minOrderCents: 0,
        usageLimit: 100,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });
    const res = await svc.place({ ...baseParams, couponCode: 'SAVE10' }, new Date());
    // 42000 − 4200 (10%) + 3000 delivery = 40800.
    expect(res).toEqual({ ok: true, orderId: 'o1', totalCents: 40800 });
    expect(f.couponUses).toContain('SAVE10');
  });

  it('rejects an ineligible coupon', async () => {
    const { svc } = build({
      confirmed: true,
      cart,
      coupon: {
        code: 'DEAD',
        type: 'FLAT',
        value: 5000,
        minOrderCents: 0,
        usageLimit: 1,
        usedCount: 1, // exhausted
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
      },
    });
    expect(await svc.place({ ...baseParams, couponCode: 'DEAD' }, new Date())).toEqual({
      ok: false,
      error: 'INVALID_COUPON',
    });
  });

  it('spends only the real wallet balance, capped at the outstanding amount', async () => {
    const { f, svc } = build({ confirmed: true, cart, balance: 1000 });
    const res = await svc.place({ ...baseParams, useWallet: true }, new Date());
    // 42000 + 3000 − 1000 wallet = 44000; debit exactly the balance.
    expect(res).toEqual({ ok: true, orderId: 'o1', totalCents: 44000 });
    expect(f.debits).toEqual([1000]);
  });

  it('blocks checkout to an address owned by another user', async () => {
    const { svc } = build({ confirmed: true, cart, addressOwner: 'someone-else' });
    expect(await svc.place(baseParams, new Date())).toEqual({ ok: false, error: 'INVALID_ADDRESS' });
  });

  it('unconfirmed payment places no order, records FAILED, preserves the cart', async () => {
    const { f, svc } = build({ confirmed: false, cart });
    const res = await svc.place(baseParams, new Date());
    expect(res).toEqual({ ok: false, error: 'PAYMENT_FAILED' });
    expect(f.created).toHaveLength(0);
    expect(f.payments).toContain('FAILED');
    expect(f.cleared.value).toBe(false);
  });

  it('empty cart blocks checkout', async () => {
    const { svc } = build({ confirmed: true, cart: { ownerId: 'u1', lines: [], subtotalCents: 0 } });
    expect(await svc.place(baseParams, new Date())).toEqual({ ok: false, error: 'EMPTY_CART' });
  });
});
