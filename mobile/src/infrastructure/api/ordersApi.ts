import { authedFetch } from './authedFetch';
import { TRPC_URL } from './config';

/** POST a tRPC mutation (superjson wire format) with the auth token attached. */
async function mutate<T>(proc: string, input: unknown): Promise<T> {
  const res = await authedFetch(`${TRPC_URL}/${proc}`, {
    method: 'POST',
    body: JSON.stringify({ json: input }),
  });
  const body = (await res.json()) as { result?: { data?: { json?: T } }; error?: { json?: { message?: string } } };
  if (!res.ok || body.error) {
    throw new Error(body.error?.json?.message ?? `${proc} failed (${res.status})`);
  }
  return body.result?.data?.json as T;
}

async function queryGet<T>(proc: string): Promise<T> {
  const res = await authedFetch(`${TRPC_URL}/${proc}`, { method: 'GET' });
  const body = (await res.json()) as { result?: { data?: { json?: T } } };
  return body.result?.data?.json as T;
}

export interface ServerOrder {
  id: string;
  status: string;
  totalCents: number;
  items: { variantId: string; qty: number; priceCents: number }[];
}

/** Ensure a local User row exists for the Supabase-authenticated user. */
export function syncSession(): Promise<{ ok: boolean; userId: string | null }> {
  return mutate('session.sync', {});
}

/** Set a cart line quantity on the server cart (owner = authed user id). */
export function setServerCartItem(
  ownerId: string,
  variantId: string,
  qty: number,
): Promise<unknown> {
  return mutate('cart.setQty', { ownerId, variantId, qty, isGuest: false });
}

export interface PlaceOrderInput {
  addressId: string;
  slotId: string;
  // Pricing (delivery, coupon, wallet) is computed server-side. The client may
  // only name a coupon or opt into wallet use.
  couponCode?: string;
  useWallet?: boolean;
  payment: { orderId: string; paymentId: string; signature: string };
}

export function placeOrder(
  input: PlaceOrderInput,
): Promise<{ ok: boolean; orderId?: string; totalCents?: number; error?: string }> {
  return mutate('checkout.place', input);
}

export interface PaymentConfig {
  keyId: string | null;
  mode: 'test' | 'live';
  configured: boolean;
}

/** Public Razorpay config (publishable key + active mode). */
export function getPaymentConfig(): Promise<PaymentConfig> {
  return queryGet<PaymentConfig>('checkout.config');
}

export interface CreatePaymentOrderResult {
  ok: boolean;
  razorpayOrderId?: string;
  amountCents?: number;
  currency?: string;
  keyId?: string | null;
  mode?: 'test' | 'live';
  error?: string;
}

/** Create a Razorpay order for the server-computed total. */
export function createPaymentOrder(input: {
  addressId?: string;
  couponCode?: string;
  useWallet?: boolean;
}): Promise<CreatePaymentOrderResult> {
  return mutate('checkout.createPaymentOrder', input);
}

export function fetchOrders(): Promise<ServerOrder[]> {
  return queryGet<ServerOrder[]>('order.list');
}
