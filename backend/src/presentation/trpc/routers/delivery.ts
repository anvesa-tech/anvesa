import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Delivery router (Requirement 18, 19). */
export const deliveryRouter = router({
  checkZone: publicProcedure
    .input(z.object({ lat: z.number(), lng: z.number() }))
    .query(({ input }) => {
      return getContainer().delivery.checkZone(input);
    }),

  slots: publicProcedure.query(async () => {
    return getContainer().delivery.getSlots(Date.now());
  }),

  registerPincode: protectedProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return getContainer().delivery.registerPincode(ctx.userId!, input.code);
    }),
});
