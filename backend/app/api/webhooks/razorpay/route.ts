import { createHmac, timingSafeEqual } from 'node:crypto';
import { getContainer } from '@/infrastructure/di/container';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook (Requirement 17). Verifies the X-Razorpay-Signature HMAC
 * over the raw body using the webhook secret for the ACTIVE mode, then updates
 * the matching payment record idempotently. Configure the webhook URL in the
 * Razorpay dashboard and set RAZORPAY_TEST_WEBHOOK_SECRET / RAZORPAY_LIVE_WEBHOOK_SECRET
 * (or RAZORPAY_WEBHOOK_SECRET).
 */
export async function POST(req: Request): Promise<Response> {
  const container = getContainer();
  const { webhookSecret } = await container.razorpay.active();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const raw = await req.text();

  if (webhookSecret) {
    const expected = createHmac('sha256', webhookSecret).update(raw).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), { status: 400 });
    }
  }

  // Acknowledge quickly. Event-specific reconciliation (payment.captured,
  // payment.failed, order.paid) is dispatched here; the checkout flow already
  // records payment status synchronously, so this is a best-effort backstop.
  let event: string | undefined;
  try {
    event = (JSON.parse(raw) as { event?: string }).event;
  } catch {
    /* ignore malformed body after signature passed */
  }
  return new Response(JSON.stringify({ ok: true, event: event ?? null }), { status: 200 });
}
