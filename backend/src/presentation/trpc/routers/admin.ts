import { z } from 'zod';
import { adminProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Admin router (Requirement 27). All endpoints require ADMIN role. */
export const adminRouter = router({
  analytics: adminProcedure.query(async () => {
    return getContainer().admin.analytics();
  }),

  orders: adminProcedure
    .input(z.object({ pageSize: z.number().int().optional() }).optional())
    .query(async ({ input }) => {
      return getContainer().admin.listOrders(input?.pageSize);
    }),
});
