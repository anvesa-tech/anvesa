/**
 * Grading value objects and the typed input boundary (Requirement 12.1, 12.2).
 *
 * The GradingInput type contains ONLY composition data (nutrition, ingredients,
 * composition attributes). There is deliberately no field for advertising,
 * sponsored-listing, payment, or brand-partnership signals — those live in
 * unrelated modules the grading code never imports. This makes it structurally
 * impossible for commercial signals to influence a grade.
 */

export type Grade = 'A' | 'B' | 'C' | 'D';

/** The four grades, best → worst. */
export const GRADE_SCALE: readonly Grade[] = ['A', 'B', 'C', 'D'] as const;

/** Nutrition facts, normalized per 100g / 100ml. */
export interface NutritionFacts {
  energyKcal: number;
  sugarG: number;
  sodiumMg: number;
  proteinG: number;
  fatG: number;
  satFatG: number;
  fibreG: number;
}

/** A single ingredient reference with objective classification flags. */
export interface IngredientRef {
  name: string;
  isAdditive: boolean;
  isAllergen: boolean;
}

/** Structural composition attributes independent of brand/marketing. */
export interface CompositionAttributes {
  /** 0..1 share of ingredients that are whole/minimally processed. */
  wholeFoodRatio: number;
  /** 0..4 NOVA-style processing level (0 = unprocessed, 4 = ultra-processed). */
  processingLevel: number;
  /** whether any added sugar is present in the ingredient list. */
  hasAddedSugar: boolean;
}

/** The ONLY input the Grading_Engine accepts. */
export interface GradingInput {
  nutrition: NutritionFacts;
  ingredients: IngredientRef[];
  composition: CompositionAttributes;
}

export type FactorTone = 'good' | 'neutral' | 'bad';

/** A human-readable factor contributing to the grade (Requirement 8.3). */
export interface GradeFactor {
  factor: string;
  detail: string;
  weight: number;
  tone: FactorTone;
}

export type FlagSeverity = 'low' | 'medium' | 'high';

/** A surfaced concern about the product (Requirement 8, 10). */
export interface RedFlag {
  type: string;
  severity: FlagSeverity;
  note: string;
}

/** The result of grading: exactly one grade, plus reasoning and red flags. */
export interface GradedResult {
  grade: Grade;
  score: number;
  reasoning: GradeFactor[];
  redFlags: RedFlag[];
}
