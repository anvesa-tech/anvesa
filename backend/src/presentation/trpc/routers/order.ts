import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Order router (Requirement 20). All endpoints are owner-scoped. */
export const orderRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getContainer().order.listOrders(ctx.userId!);
  }),

  tracking: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getContainer().order.getTracking(ctx.userId!, input.orderId);
    }),
});
