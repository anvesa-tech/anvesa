import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

/**
 * tRPC initialization + Security_Layer middleware (Requirement 30, 31.1).
 * Procedures are the presentation layer; they call application services from
 * the DI container. Guards enforce authentication and role authorization.
 */
export interface Context {
  userId: string | null;
  role: 'CUSTOMER' | 'ADMIN' | 'VENDOR' | null;
}

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router = t.router;
export const publicProcedure = t.procedure;

/** Requires a valid authenticated session (Requirement 30.1, 30.2). */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Requires an ADMIN role (Requirement 27.7). */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || ctx.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Administrator access required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

/** Requires a VENDOR (or ADMIN) role. */
export const vendorProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId || (ctx.role !== 'VENDOR' && ctx.role !== 'ADMIN')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Vendor access required' });
  }
  return next({ ctx: { ...ctx, userId: ctx.userId } });
});
