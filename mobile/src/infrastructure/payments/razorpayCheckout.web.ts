/**
 * Razorpay Checkout — web implementation (Requirement 17). Loads Razorpay's
 * hosted checkout.js and opens the payment modal. Resolves with the payment
 * credentials on success, or null if the user dismisses the modal.
 */
export const razorpayCheckoutSupported = true;

export interface RazorpayResult {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface RazorpayOpenParams {
  keyId: string;
  razorpayOrderId: string;
  amountCents: number;
  currency: string;
  name: string;
  description?: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCtor {
  new (options: Record<string, unknown>): { open: () => void };
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    const w = window as unknown as { Razorpay?: RazorpayCtor };
    if (w.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(params: RazorpayOpenParams): Promise<RazorpayResult | null> {
  const ok = await loadScript();
  if (!ok) throw new Error('Could not load Razorpay Checkout.');
  const w = window as unknown as { Razorpay: RazorpayCtor };

  return new Promise<RazorpayResult | null>((resolve) => {
    const rzp = new w.Razorpay({
      key: params.keyId,
      order_id: params.razorpayOrderId,
      amount: params.amountCents,
      currency: params.currency,
      name: params.name,
      description: params.description ?? 'ANVESA order',
      handler: (resp: RazorpayResponse) => {
        resolve({
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        });
      },
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
