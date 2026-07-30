import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Wishlist router (Requirement 6, 7). Owner-scoped. */
export const wishlistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return getContainer().wishlist.list(ctx.userId!);
  }),
  add: protectedProcedure.input(z.object({ productId: z.string() })).mutation(async ({ ctx, input }) => {
    await getContainer().wishlist.add(ctx.userId!, input.productId);
    return { ok: true };
  }),
  remove: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getContainer().wishlist.remove(ctx.userId!, input.productId);
      return { ok: true };
    }),
  recentlyViewed: protectedProcedure.query(async ({ ctx }) => {
    return getContainer().wishlist.recentlyViewed(ctx.userId!);
  }),
});
