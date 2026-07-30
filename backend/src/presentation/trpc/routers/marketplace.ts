import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';
import { GROUP_KEYS } from '../../../domain/catalog/types';

/** Marketplace router (Requirement 5). Public reads. */
export const marketplaceRouter = router({
  homeGroups: publicProcedure.query(async () => {
    return getContainer().marketplace.getHomeGroups();
  }),

  groupPage: publicProcedure
    .input(
      z.object({
        group: z.enum(GROUP_KEYS),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      return getContainer().marketplace.getGroupPage(input.group, input.cursor);
    }),
});
