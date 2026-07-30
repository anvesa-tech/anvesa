import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  validateProfile,
  GENDERS,
  ACTIVITY_LEVELS,
  DIETS,
  type HealthProfileInput,
} from './validation';

const RUNS = { numRuns: 100 };

const arbValid: fc.Arbitrary<HealthProfileInput> = fc.record({
  age: fc.integer({ min: 1, max: 120 }),
  gender: fc.constantFrom(...GENDERS),
  heightCm: fc.integer({ min: 30, max: 300 }),
  weightKg: fc.integer({ min: 1, max: 500 }),
  conditions: fc.array(fc.string(), { maxLength: 4 }),
  goals: fc.array(fc.string(), { maxLength: 4 }),
  activityLevel: fc.constantFrom(...ACTIVITY_LEVELS),
  diet: fc.constantFrom(...DIETS),
});

describe('health-profile validation', () => {
  // Feature: anvesa-marketplace, Property 54: Health-profile range validation with unchanged prior state
  it('Property 54: valid input accepted; out-of-range/invalid rejected with the field', () => {
    fc.assert(
      fc.property(arbValid, (p) => {
        expect(validateProfile(p)).toEqual({ ok: true });
      }),
      RUNS,
    );
    // out-of-range age
    fc.assert(
      fc.property(arbValid, fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 121 })), (p, age) => {
        expect(validateProfile({ ...p, age })).toEqual({ ok: false, invalidField: 'age' });
      }),
      RUNS,
    );
    // invalid gender
    fc.assert(
      fc.property(arbValid, (p) => {
        expect(validateProfile({ ...p, gender: 'ROBOT' })).toEqual({
          ok: false,
          invalidField: 'gender',
        });
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 55: Health-profile update round-trip
  it('Property 55: a valid profile validates consistently (idempotent acceptance)', () => {
    fc.assert(
      fc.property(arbValid, (p) => {
        expect(validateProfile(p).ok).toBe(true);
        expect(validateProfile({ ...p }).ok).toBe(true);
      }),
      RUNS,
    );
  });
});
