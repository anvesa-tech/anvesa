import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/** Newsletter router (Requirement 25). Reads are public; saves require auth. */
export const newsletterRouter = router({
  articles: publicProcedure
    .input(z.object({ cursor: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return getContainer().newsletter.listArticles(input?.cursor);
    }),

  save: protectedProcedure
    .input(z.object({ articleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getContainer().newsletter.saveArticle(ctx.userId!, input.articleId);
      return { ok: true };
    }),

  setProgress: protectedProcedure
    .input(z.object({ articleId: z.string(), pct: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      return getContainer().newsletter.setProgress(ctx.userId!, input.articleId, input.pct);
    }),

  saved: protectedProcedure.query(async ({ ctx }) => {
    return getContainer().newsletter.listSaved(ctx.userId!);
  }),
});
