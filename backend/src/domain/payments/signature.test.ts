import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { expectedSignature, verifyPaymentSignature } from './signature';

const RUNS = { numRuns: 100 };

describe('Razorpay signature verification', () => {
  // Feature: anvesa-marketplace, Property 17: Payment success requires a valid signature
  it('Property 17: verifies iff the signature matches the expected HMAC', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string(),
        (orderId, paymentId, secret, tampered) => {
          const good = expectedSignature(orderId, paymentId, secret);
          expect(verifyPaymentSignature({ orderId, paymentId, signature: good, secret })).toBe(true);

          const valid = verifyPaymentSignature({
            orderId,
            paymentId,
            signature: tampered,
            secret,
          });
          expect(valid).toBe(tampered === good);
        },
      ),
      RUNS,
    );
  });
});
