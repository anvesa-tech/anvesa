import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { getContainer } from '../../../infrastructure/di/container';

/**
 * Scanner router (Requirement 10). Resolves a scanned barcode to a product's
 * full grade/analysis, or a not-found result so the client can offer the
 * food-label capture fallback.
 */
export const scannerRouter = router({
  lookup: publicProcedure
    .input(z.object({ barcode: z.string().min(1) }))
    .query(async ({ input }) => {
      // Checks the ANVESA catalog first, then falls back to Open Food Facts,
      // grading any external composition with our own Grading_Engine.
      return getContainer().product.scanBarcode(input.barcode);
    }),

  // Read the text off a photographed food label via server-side OCR (R10).
  // Returns raw recognised text; the client parses it into ingredients+nutrition.
  readLabel: publicProcedure
    .input(z.object({ imageBase64: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const text = await getContainer().ocr.readText(input.imageBase64);
      return { text };
    }),

  // Analyse a food label's ingredients + nutrition (Requirement 10). Grades any
  // product — even without a barcode match — using our own Grading_Engine.
  analyzeLabel: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        brand: z.string().optional(),
        ingredientsText: z.string().min(1),
        nutrition: z.object({
          energyKcal: z.number().min(0),
          sugarG: z.number().min(0),
          sodiumMg: z.number().min(0),
          proteinG: z.number().min(0),
          fatG: z.number().min(0),
          satFatG: z.number().min(0),
          fibreG: z.number().min(0),
        }),
      }),
    )
    .mutation(async ({ input }) => {
      const product = await getContainer().product.analyzeLabel(input);
      return { found: true as const, product };
    }),
});
