import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { parseIngredients, parseLabelToInput } from './parseLabel';
import type { NutritionFacts } from './types';

const RUNS = { numRuns: 200 };

const arbNutrition: fc.Arbitrary<NutritionFacts> = fc.record({
  energyKcal: fc.double({ min: 0, max: 900, noNaN: true }),
  sugarG: fc.double({ min: 0, max: 100, noNaN: true }),
  sodiumMg: fc.double({ min: 0, max: 5000, noNaN: true }),
  proteinG: fc.double({ min: 0, max: 100, noNaN: true }),
  fatG: fc.double({ min: 0, max: 100, noNaN: true }),
  satFatG: fc.double({ min: 0, max: 100, noNaN: true }),
  fibreG: fc.double({ min: 0, max: 100, noNaN: true }),
});

describe('parseLabel', () => {
  // Feature: anvesa-marketplace, Requirement 10: label analysis composition bounds
  it('composition attributes are always within valid engine bounds', () => {
    fc.assert(
      fc.property(fc.string(), arbNutrition, (text, nutrition) => {
        const input = parseLabelToInput(text, nutrition);
        const { wholeFoodRatio, processingLevel } = input.composition;
        expect(wholeFoodRatio).toBeGreaterThanOrEqual(0);
        expect(wholeFoodRatio).toBeLessThanOrEqual(1);
        expect(processingLevel).toBeGreaterThanOrEqual(1);
        expect(processingLevel).toBeLessThanOrEqual(4);
        expect(Number.isInteger(processingLevel)).toBe(true);
      }),
      RUNS,
    );
  });

  it('never emits empty ingredient names and caps the count', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const parsed = parseIngredients(text);
        expect(parsed.length).toBeLessThanOrEqual(30);
        for (const ing of parsed) {
          expect(ing.name.length).toBeGreaterThan(0);
        }
      }),
      RUNS,
    );
  });

  it('detects added sugar whenever a sugar keyword is present', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('sugar', 'glucose syrup', 'honey', 'fructose', 'corn syrup'),
        arbNutrition,
        (sugarWord, nutrition) => {
          const input = parseLabelToInput(`Water, ${sugarWord}, Salt`, nutrition);
          expect(input.composition.hasAddedSugar).toBe(true);
        },
      ),
      RUNS,
    );
  });

  it('classifies E-numbers and additive keywords as additives', () => {
    const parsed = parseIngredients('Oats, E322 (emulsifier), Preservative INS 211, Salt');
    const additives = parsed.filter((i) => i.isAdditive).map((i) => i.name);
    expect(additives.length).toBeGreaterThan(0);
  });
});
