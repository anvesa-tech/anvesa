import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/**
 * Session router (Requirement 1, 2, 3). Authentication itself (OTP / Apple /
 * Google) is handled by Supabase Auth on the client; the backend only verifies
 * the Supabase access token and mirrors the user into the local User table.
 */
export const sessionRouter = router({
  /** Current authenticated identity, or null when unauthenticated. */
  me: publicProcedure.query(({ ctx }) => {
    return { userId: ctx.userId, role: ctx.role };
  }),

  /** Ensure a local User row exists for the Supabase-authenticated user. */
  sync: protectedProcedure
    .input(z.object({ email: z.string().email().nullish(), phone: z.string().nullish() }).optional())
    .mutation(async ({ ctx, input }) => {
      await getContainer().authUsers.ensure(ctx.userId!, input?.email ?? null, input?.phone ?? null);
      return { ok: true, userId: ctx.userId, role: ctx.role };
    }),
});
