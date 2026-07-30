import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';
import { HEALTH_FILTERS } from '../../../domain/catalog/filters';

/** Search router (Requirement 9). */
export const searchRouter = router({
  query: publicProcedure
    .input(
      z.object({
        q: z.string().default(''),
        filters: z.array(z.enum(HEALTH_FILTERS)).default([]),
      }),
    )
    .query(async ({ input }) => {
      return getContainer().search.search(input.q, input.filters);
    }),
});
