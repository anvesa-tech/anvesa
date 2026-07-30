/**
 * Health-profile validation (Requirement 4). Pure.
 */
export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_SAY'] as const;
export const ACTIVITY_LEVELS = ['SEDENTARY', 'LIGHT', 'MODERATE', 'ACTIVE', 'VERY_ACTIVE'] as const;
export const DIETS = ['VEG', 'NON_VEG', 'VEGAN', 'EGGETARIAN'] as const;

export type Gender = (typeof GENDERS)[number];
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];
export type Diet = (typeof DIETS)[number];

export interface HealthProfileInput {
  age: number;
  gender: string;
  heightCm: number;
  weightKg: number;
  conditions: string[];
  goals: string[];
  activityLevel: string;
  diet: string;
}

export type ProfileValidation =
  | { ok: true }
  | { ok: false; invalidField: string };

/** Validate each field against its range or value set (Requirement 4.1, 4.2). */
export function validateProfile(input: HealthProfileInput): ProfileValidation {
  if (!Number.isInteger(input.age) || input.age < 1 || input.age > 120) {
    return { ok: false, invalidField: 'age' };
  }
  if (!GENDERS.includes(input.gender as Gender)) return { ok: false, invalidField: 'gender' };
  if (!Number.isFinite(input.heightCm) || input.heightCm < 30 || input.heightCm > 300) {
    return { ok: false, invalidField: 'heightCm' };
  }
  if (!Number.isFinite(input.weightKg) || input.weightKg < 1 || input.weightKg > 500) {
    return { ok: false, invalidField: 'weightKg' };
  }
  if (!ACTIVITY_LEVELS.includes(input.activityLevel as ActivityLevel)) {
    return { ok: false, invalidField: 'activityLevel' };
  }
  if (!DIETS.includes(input.diet as Diet)) return { ok: false, invalidField: 'diet' };
  return { ok: true };
}
