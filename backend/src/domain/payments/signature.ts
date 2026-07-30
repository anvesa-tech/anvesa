import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay payment signature verification (Requirement 17.2). Pure and
 * deterministic: the expected signature is HMAC-SHA256 of `${orderId}|${paymentId}`
 * keyed by the Razorpay secret, compared in constant time.
 */
export function expectedSignature(orderId: string, paymentId: string, secret: string): string {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}): boolean {
  const expected = expectedSignature(params.orderId, params.paymentId, params.secret);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(params.signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
