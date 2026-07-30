import { verifyPaymentSignature } from '../../domain/payments/signature';
import type { PaymentGateway } from '../../domain/ports/gateways';
import type { RazorpayConfig } from './RazorpayConfig';

/**
 * Razorpay PaymentGateway adapter (Requirement 17). Creates payment orders via
 * the Razorpay REST API and verifies success signatures with the pure,
 * property-tested verifier. Credentials for the ACTIVE mode (test/live) are
 * resolved per call from RazorpayConfig, so switching mode takes effect
 * immediately without a redeploy.
 */
export class RazorpayGateway implements PaymentGateway {
  constructor(private readonly config: RazorpayConfig) {}

  async createOrder(amountCents: number, orderRef: string): Promise<{ providerOrderId: string }> {
    const { keyId, keySecret } = await this.config.active();
    if (!keyId || !keySecret) {
      // Dev fallback so checkout flows are exercisable without configured keys.
      return { providerOrderId: `rzp_test_${orderRef}` };
    }
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      // Razorpay amounts are in the currency subunit (paise for INR).
      body: JSON.stringify({ amount: amountCents, currency: 'INR', receipt: orderRef }),
    });
    if (!res.ok) {
      throw new Error(`Razorpay order creation failed: ${res.status} ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string };
    return { providerOrderId: data.id };
  }

  async verifySignature(payload: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): Promise<boolean> {
    const { keySecret } = await this.config.active();
    if (!keySecret) {
      // Dev/local mode without configured keys: accept a well-known test
      // signature so checkout is exercisable. Real deployments have a secret.
      return payload.signature === 'dev-valid';
    }
    return verifyPaymentSignature({ ...payload, secret: keySecret });
  }
}
