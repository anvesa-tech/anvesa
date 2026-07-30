import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Product router (Requirement 8). */
export const productRouter = router({
  byId: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return getContainer().product.getDetail(input.id);
  }),
});
