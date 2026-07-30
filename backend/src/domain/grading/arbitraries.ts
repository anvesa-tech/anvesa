import fc from 'fast-check';
import type { GradingInput } from './types';

/** Arbitrary composition input for the Grading_Engine. */
export const arbComposition: fc.Arbitrary<GradingInput> = fc.record({
  nutrition: fc.record({
    energyKcal: fc.double({ min: 0, max: 900, noNaN: true }),
    sugarG: fc.double({ min: 0, max: 100, noNaN: true }),
    sodiumMg: fc.double({ min: 0, max: 3000, noNaN: true }),
    proteinG: fc.double({ min: 0, max: 100, noNaN: true }),
    fatG: fc.double({ min: 0, max: 100, noNaN: true }),
    satFatG: fc.double({ min: 0, max: 60, noNaN: true }),
    fibreG: fc.double({ min: 0, max: 60, noNaN: true }),
  }),
  ingredients: fc.array(
    fc.record({
      name: fc.string({ minLength: 1, maxLength: 20 }),
      isAdditive: fc.boolean(),
      isAllergen: fc.boolean(),
    }),
    { maxLength: 12 },
  ),
  composition: fc.record({
    wholeFoodRatio: fc.double({ min: 0, max: 1, noNaN: true }),
    processingLevel: fc.integer({ min: 0, max: 4 }),
    hasAddedSugar: fc.boolean(),
  }),
});

/**
 * Arbitrary commercial signals — advertising, sponsorship, payment,
 * partnership. These MUST NOT affect grading; they exist only to prove the
 * Grading_Engine ignores them (there is no way to feed them into computeGrade).
 */
export const arbCommercialSignals = fc.record({
  isAdvertised: fc.boolean(),
  isSponsored: fc.boolean(),
  paidListingCents: fc.integer({ min: 0, max: 1_000_000 }),
  hasBrandPartnership: fc.boolean(),
  brandName: fc.string(),
});
