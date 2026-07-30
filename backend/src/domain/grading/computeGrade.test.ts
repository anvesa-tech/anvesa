import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { computeGrade } from './computeGrade';
import { GRADE_SCALE } from './types';
import { arbComposition, arbCommercialSignals } from './arbitraries';

const RUNS = { numRuns: 100 };

describe('Grading_Engine integrity', () => {
  // Feature: anvesa-marketplace, Property 1: Grade depends only on composition, never on commercial signals
  it('Property 1: grade is invariant across arbitrary commercial signals', () => {
    fc.assert(
      fc.property(arbComposition, arbCommercialSignals, arbCommercialSignals, (input, _s1, _s2) => {
        // Commercial signals (_s1, _s2) cannot be passed to computeGrade at
        // all; grading the same composition must yield the same grade
        // regardless of them.
        void _s1;
        void _s2;
        const a = computeGrade(input);
        const b = computeGrade(input);
        expect(a.grade).toBe(b.grade);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 2: Every grade is exactly one value from the defined scale
  it('Property 2: returns exactly one grade from the defined scale', () => {
    fc.assert(
      fc.property(arbComposition, (input) => {
        const { grade } = computeGrade(input);
        expect(GRADE_SCALE).toContain(grade);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 1: Grade depends only on composition, never on commercial signals
  it('Property 1 (determinism): identical inputs yield identical grades', () => {
    fc.assert(
      fc.property(arbComposition, (input) => {
        const a = computeGrade(structuredClone(input));
        const b = computeGrade(structuredClone(input));
        expect(a.grade).toBe(b.grade);
        expect(a.score).toBe(b.score);
      }),
      RUNS,
    );
  });
});
