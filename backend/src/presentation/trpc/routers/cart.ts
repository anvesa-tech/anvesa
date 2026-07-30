import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';
import type { Context } from '../trpc';

/**
 * Cart router (Requirement 6, 13, 22). When the request is authenticated the
 * cart owner is ALWAYS the session user — the client-supplied `ownerId` is
 * ignored — so one user can never read or mutate another user's cart. Only
 * unauthenticated (guest-device) requests may use a client-supplied ownerId.
 */
function resolveOwner(ctx: Context, ownerId: string): { ownerId: string; isGuest: boolean } {
  if (ctx.userId) return { ownerId: ctx.userId, isGuest: false };
  return { ownerId, isGuest: true };
}

const ownerInput = z.object({ ownerId: z.string().min(1), isGuest: z.boolean().default(true) });

export const cartRouter = router({
  get: publicProcedure
    .input(z.object({ ownerId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { ownerId } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.getCart(ownerId);
    }),

  quickAdd: publicProcedure
    .input(ownerInput.extend({ variantId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerId, isGuest } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.quickAdd(ownerId, input.variantId, isGuest);
    }),

  setQty: publicProcedure
    .input(ownerInput.extend({ variantId: z.string().min(1), qty: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const { ownerId, isGuest } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.setQty(ownerId, input.variantId, input.qty, isGuest);
    }),

  removeItem: publicProcedure
    .input(z.object({ ownerId: z.string().min(1), itemId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerId } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.removeItem(ownerId, input.itemId);
    }),

  addBundle: publicProcedure
    .input(ownerInput.extend({ bundleId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerId, isGuest } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.addBundle(ownerId, input.bundleId, isGuest);
    }),

  clear: publicProcedure
    .input(z.object({ ownerId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const { ownerId } = resolveOwner(ctx, input.ownerId);
      return getContainer().cart.clear(ownerId);
    }),
});
