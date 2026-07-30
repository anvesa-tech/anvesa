import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Rewards router (Requirement 23, 24). */
export const rewardsRouter = router({
  leaderboard: publicProcedure.query(async () => {
    return getContainer().rewards.leaderboard();
  }),

  awardScan: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const utcDay = new Date().toISOString().slice(0, 10);
      return getContainer().rewards.awardScan(ctx.userId!, input.productId, utcDay);
    }),
});
