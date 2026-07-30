import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Checkout router (Requirement 16, 17). Owner-scoped; pricing server-computed. */
export const checkoutRouter = router({
  /**
   * Public Razorpay config for the client to open Checkout: the publishable
   * key id and the active mode (test/live). Never returns a secret.
   */
  config: publicProcedure.query(async () => {
    const c = await getContainer().razorpay.active();
    return { keyId: c.keyId ?? null, mode: c.mode, configured: c.configured };
  }),

  /**
   * Create a Razorpay order for the server-computed total (Requirement 17.1).
   * Returns the order id + amount + publishable key so the client can launch
   * Razorpay Checkout.
   */
  createPaymentOrder: protectedProcedure
    .input(
      z.object({
        addressId: z.string().optional(),
        couponCode: z.string().min(1).optional(),
        useWallet: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await getContainer().checkout.createPaymentOrder(
        { userId: ctx.userId!, ...input },
        new Date(),
      );
      if (!result.ok) return result;
      const cfg = await getContainer().razorpay.active();
      return { ...result, keyId: cfg.keyId ?? null, mode: cfg.mode };
    }),

  place: protectedProcedure
    .input(
      z.object({
        addressId: z.string(),
        slotId: z.string(),
        // Pricing (delivery, coupon, wallet) is computed server-side. The client
        // may only name a coupon or opt into wallet use — never the amounts.
        couponCode: z.string().min(1).optional(),
        useWallet: z.boolean().optional(),
        payment: z.object({
          orderId: z.string(),
          paymentId: z.string(),
          signature: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return getContainer().checkout.place({ userId: ctx.userId!, ...input }, new Date());
    }),
});
