import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Subscription router (Requirement 21). All actions are owner-scoped. */
async function guardOwnership<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === 'NOT_OWNER') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Not your subscription' });
    }
    throw e;
  }
}

export const subscriptionRouter = router({
  pause: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await guardOwnership(() => getContainer().subscription.pause(ctx.userId!, input.id));
    return { ok: true };
  }),
  resume: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await guardOwnership(() => getContainer().subscription.resume(ctx.userId!, input.id));
    return { ok: true };
  }),
  cancel: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    await guardOwnership(() => getContainer().subscription.cancel(ctx.userId!, input.id));
    return { ok: true };
  }),
});
