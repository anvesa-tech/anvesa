import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { z } from 'zod';

const RUNS = { numRuns: 100 };

// Representative request schema (mirrors router inputs).
const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(2000),
});

describe('schema validation', () => {
  // Feature: anvesa-marketplace, Property 53: Schema validation rejects malformed payloads
  it('Property 53: accepts iff the payload satisfies the schema', () => {
    fc.assert(
      fc.property(
        fc.record({
          productId: fc.oneof(fc.string(), fc.constant('')),
          rating: fc.oneof(fc.integer(), fc.double({ noNaN: true })),
          text: fc.string({ maxLength: 2100 }),
        }),
        (payload) => {
          const result = reviewSchema.safeParse(payload);
          const valid =
            payload.productId.length >= 1 &&
            Number.isInteger(payload.rating) &&
            payload.rating >= 1 &&
            payload.rating <= 5 &&
            payload.text.length <= 2000;
          expect(result.success).toBe(valid);
        },
      ),
      RUNS,
    );
  });
});
