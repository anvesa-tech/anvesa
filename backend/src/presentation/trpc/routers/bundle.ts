import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Bundle router (Requirement 22). */
export const bundleRouter = router({
  list: publicProcedure.query(async () => {
    return getContainer().bundle.listBundles();
  }),
});
