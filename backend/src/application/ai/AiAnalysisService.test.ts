import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { AiAnalysisService } from './AiAnalysisService';
import { computeGrade } from '../../domain/grading/computeGrade';
import { arbComposition } from '../../domain/grading/arbitraries';
import type { AiGateway } from '../../domain/ports/gateways';

const RUNS = { numRuns: 100 };

describe('AiAnalysisService', () => {
  // Feature: anvesa-marketplace, Property 5: AI analysis never alters the grade
  it('Property 5: grade computed before and after analysis is identical for any AI output', () => {
    fc.assert(
      fc.asyncProperty(
        arbComposition,
        fc.oneof(fc.string(), fc.constant(''), fc.constant('A\n\nB'), fc.constant('{malformed')),
        fc.boolean(),
        async (input, aiText, shouldFail) => {
          const gateway: AiGateway = {
            async analyze() {
              if (shouldFail) throw new Error('claude down');
              return aiText;
            },
          };
          const svc = new AiAnalysisService(gateway);

          const before = computeGrade(input).grade;
          const result = await svc.analyze(input.ingredients, input.nutrition);
          const after = computeGrade(input).grade;

          // The AI result never carries or changes a grade.
          expect(after).toBe(before);
          expect(result).not.toHaveProperty('grade');
          if (shouldFail) expect(result.available).toBe(false);
        },
      ),
      RUNS,
    );
  });

  it('returns unavailable when the gateway times out/errors', async () => {
    const gateway: AiGateway = {
      async analyze() {
        throw new Error('timeout');
      },
    };
    const svc = new AiAnalysisService(gateway);
    const res = await svc.analyze([], {
      energyKcal: 100,
      sugarG: 1,
      sodiumMg: 10,
      proteinG: 5,
      fatG: 2,
      satFatG: 1,
      fibreG: 3,
    });
    expect(res).toEqual({ available: false, reason: 'unavailable' });
  });
});
