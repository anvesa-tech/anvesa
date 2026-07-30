/**
 * Pure checkout outcome resolver (Requirement 16.5, 16.6, 17.3, 17.5). No I/O.
 *
 * Encodes the confirmed/unconfirmed payment truth table so the application
 * layer only has to execute the resulting effects.
 */

export interface CheckoutOutcome {
  createOrder: boolean;
  clearCart: boolean;
  preserveCart: boolean;
  orderPlaced: boolean;
  paymentRecordStatus: 'SUCCESS' | 'FAILED';
}

/**
 * Given whether payment was confirmed (signature verified), resolve the
 * outcome. Confirmed → create order + clear cart. Not confirmed → preserve
 * cart, order unplaced, failed payment record.
 */
export function resolveCheckout(paymentConfirmed: boolean): CheckoutOutcome {
  if (paymentConfirmed) {
    return {
      createOrder: true,
      clearCart: true,
      preserveCart: false,
      orderPlaced: true,
      paymentRecordStatus: 'SUCCESS',
    };
  }
  return {
    createOrder: false,
    clearCart: false,
    preserveCart: true,
    orderPlaced: false,
    paymentRecordStatus: 'FAILED',
  };
}
