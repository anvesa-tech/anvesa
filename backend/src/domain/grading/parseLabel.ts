/**
 * Pure label parser (Requirement 10). Converts a food label's raw ingredient
 * text + nutrition panel into the Grading_Engine's typed GradingInput. Being
 * pure and deterministic, it is unit/property-testable and free of any
 * commercial signal — the same integrity guarantee as the engine itself.
 */
import type { GradingInput, IngredientRef, NutritionFacts } from './types';

/** Common additive keywords / E-number pattern for objective classification. */
const ADDITIVE_HINTS = [
  'preservative',
  'colour',
  'color',
  'flavour',
  'flavor',
  'emulsifier',
  'stabiliser',
  'stabilizer',
  'thickener',
  'acidity regulator',
  'antioxidant',
  'raising agent',
  'anticaking',
  'sweetener',
  'monosodium glutamate',
  'msg',
  'aspartame',
  'sucralose',
  'maltodextrin',
];

const SUGAR_HINTS = [
  'sugar',
  'syrup',
  'glucose',
  'fructose',
  'dextrose',
  'maltose',
  'honey',
  'molasses',
  'corn syrup',
];

const E_NUMBER = /\be\s?\d{3}[a-z]?\b/i;

function isAdditive(name: string): boolean {
  const lower = name.toLowerCase();
  if (E_NUMBER.test(lower)) return true;
  return ADDITIVE_HINTS.some((h) => lower.includes(h));
}

/** Split a raw ingredients string into individual, classified ingredients. */
export function parseIngredients(text: string): IngredientRef[] {
  return text
    .split(/[,;()\n]/)
    .map((s) => s.replace(/[.*]/g, '').trim())
    .filter((s) => s.length > 0 && s.length < 60)
    .slice(0, 30)
    .map((name) => ({ name, isAdditive: isAdditive(name), isAllergen: false }));
}

/**
 * Build a GradingInput from a scanned/entered label. Composition attributes are
 * inferred objectively: processing level from additive density, whole-food
 * ratio from the share of non-additive ingredients, added sugar from keywords.
 */
export function parseLabelToInput(
  ingredientsText: string,
  nutrition: NutritionFacts,
): GradingInput {
  const ingredients = parseIngredients(ingredientsText);
  const total = ingredients.length || 1;
  const additiveCount = ingredients.filter((i) => i.isAdditive).length;
  const wholeFoodRatio = Math.max(0, 1 - additiveCount / total);
  // 0 additives → level 1; scale up to 4 as additive density rises.
  const processingLevel = Math.min(4, Math.round(1 + (additiveCount / total) * 3));
  const hasAddedSugar = SUGAR_HINTS.some((h) => ingredientsText.toLowerCase().includes(h));

  return {
    nutrition,
    ingredients,
    composition: {
      wholeFoodRatio,
      processingLevel,
      hasAddedSugar,
    },
  };
}
