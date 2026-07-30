/**
 * Razorpay Checkout — native fallback (Requirement 17).
 *
 * Native checkout needs the react-native-razorpay SDK (a custom dev build). In
 * this managed build the interactive Razorpay flow runs on web only; native
 * callers fall back to the standard flow. See razorpayCheckout.web.ts.
 */
export const razorpayCheckoutSupported = false;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function openRazorpayCheckout(_params: RazorpayOpenParams): Promise<RazorpayResult | null> {
  throw new Error('Razorpay Checkout runs on the web build in this app.');
}
