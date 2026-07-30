/**
 * The Grading_Engine — the trust anchor of ANVESA (Requirement 12).
 *
 * `computeGrade` is PURE, TOTAL, and DETERMINISTIC:
 *   - pure: no clock, no randomness, no I/O, no database, no ambient state;
 *   - total: defined for every GradingInput (values are clamped, never throws);
 *   - deterministic: identical composition inputs always yield the identical
 *     grade — regardless of brand, listing, payment, or partnership, because
 *     those signals are not part of the input type at all (Requirement 12.6).
 *
 * The result is exactly one Grade from GRADE_SCALE (Requirement 12.3).
 */
import {
  GRADE_SCALE,
  type Grade,
  type GradeFactor,
  type GradedResult,
  type GradingInput,
  type RedFlag,
} from './types';

const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Per-100g thresholds derived from common front-of-pack nutrition guidance. */
const SUGAR_HIGH = 22.5;
const SUGAR_LOW = 5;
const SODIUM_HIGH = 600; // mg
const SODIUM_LOW = 120; // mg
const SATFAT_HIGH = 5;
const SATFAT_LOW = 1.5;
const FIBRE_GOOD = 6;
const PROTEIN_GOOD = 8;

/**
 * Maps a 0..100 quality score to a grade. Higher score = cleaner product.
 * Boundaries are fixed constants so the mapping is fully deterministic.
 */
function scoreToGrade(score: number): Grade {
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'D';
}

export function computeGrade(input: GradingInput): GradedResult {
  const { nutrition: n, ingredients, composition: c } = input;

  const reasoning: GradeFactor[] = [];
  const redFlags: RedFlag[] = [];

  // Start from a neutral baseline and adjust by objective composition signals.
  let score = 50;

  // --- Sugar ---
  if (n.sugarG <= SUGAR_LOW) {
    score += 12;
    reasoning.push({
      factor: 'Low sugar',
      detail: `${n.sugarG} g sugar per 100g`,
      weight: 12,
      tone: 'good',
    });
  } else if (n.sugarG >= SUGAR_HIGH) {
    score -= 18;
    reasoning.push({
      factor: 'High sugar',
      detail: `${n.sugarG} g sugar per 100g`,
      weight: -18,
      tone: 'bad',
    });
    redFlags.push({
      type: 'high_sugar',
      severity: 'high',
      note: `Contains ${n.sugarG} g sugar per 100g, above recommended limits.`,
    });
  }

  // --- Sodium ---
  if (n.sodiumMg <= SODIUM_LOW) {
    score += 8;
    reasoning.push({
      factor: 'Low sodium',
      detail: `${n.sodiumMg} mg sodium per 100g`,
      weight: 8,
      tone: 'good',
    });
  } else if (n.sodiumMg >= SODIUM_HIGH) {
    score -= 12;
    reasoning.push({
      factor: 'High sodium',
      detail: `${n.sodiumMg} mg sodium per 100g`,
      weight: -12,
      tone: 'bad',
    });
    redFlags.push({
      type: 'high_sodium',
      severity: 'medium',
      note: `Contains ${n.sodiumMg} mg sodium per 100g.`,
    });
  }

  // --- Saturated fat ---
  if (n.satFatG <= SATFAT_LOW) {
    score += 6;
  } else if (n.satFatG >= SATFAT_HIGH) {
    score -= 10;
    reasoning.push({
      factor: 'High saturated fat',
      detail: `${n.satFatG} g per 100g`,
      weight: -10,
      tone: 'bad',
    });
    redFlags.push({
      type: 'high_sat_fat',
      severity: 'medium',
      note: `Contains ${n.satFatG} g saturated fat per 100g.`,
    });
  }

  // --- Positive nutrients ---
  if (n.fibreG >= FIBRE_GOOD) {
    score += 8;
    reasoning.push({
      factor: 'Good fibre',
      detail: `${n.fibreG} g fibre per 100g`,
      weight: 8,
      tone: 'good',
    });
  }
  if (n.proteinG >= PROTEIN_GOOD) {
    score += 8;
    reasoning.push({
      factor: 'Good protein',
      detail: `${n.proteinG} g protein per 100g`,
      weight: 8,
      tone: 'good',
    });
  }

  // --- Processing & whole-food ratio ---
  const wholeFoodRatio = clamp(c.wholeFoodRatio, 0, 1);
  score += Math.round((wholeFoodRatio - 0.5) * 24); // -12..+12
  if (wholeFoodRatio >= 0.75) {
    reasoning.push({
      factor: 'Whole-food ingredients',
      detail: 'Made largely from recognizable whole ingredients.',
      weight: 12,
      tone: 'good',
    });
  }

  const processingLevel = clamp(c.processingLevel, 0, 4);
  score -= processingLevel * 5; // 0..-20
  if (processingLevel >= 4) {
    reasoning.push({
      factor: 'Ultra-processed',
      detail: 'Highly processed formulation.',
      weight: -20,
      tone: 'bad',
    });
    redFlags.push({
      type: 'ultra_processed',
      severity: 'medium',
      note: 'Ultra-processed product (NOVA level 4).',
    });
  }

  // --- Additives ---
  const additives = ingredients.filter((i) => i.isAdditive);
  if (additives.length > 0) {
    score -= Math.min(15, additives.length * 5);
    reasoning.push({
      factor: 'Contains additives',
      detail: `${additives.length} additive(s) detected.`,
      weight: -Math.min(15, additives.length * 5),
      tone: 'bad',
    });
    redFlags.push({
      type: 'additives',
      severity: additives.length >= 3 ? 'high' : 'low',
      note: `Contains ${additives.length} additive(s).`,
    });
  } else {
    score += 5;
    reasoning.push({
      factor: 'No artificial additives',
      detail: 'Free from additives.',
      weight: 5,
      tone: 'good',
    });
  }

  // --- Added sugar flag ---
  if (c.hasAddedSugar) {
    score -= 6;
  } else {
    reasoning.push({
      factor: 'No added sugar',
      detail: 'No added sugar in the ingredient list.',
      weight: 4,
      tone: 'good',
    });
  }

  const finalScore = clamp(Math.round(score), 0, 100);
  const grade = scoreToGrade(finalScore);

  // Invariant: grade is always exactly one member of the defined scale.
  if (!GRADE_SCALE.includes(grade)) {
    // Unreachable by construction; keeps the function total.
    return { grade: 'D', score: finalScore, reasoning, redFlags };
  }

  return { grade, score: finalScore, reasoning, redFlags };
}

/**
 * Deterministic hash of the composition inputs, used to audit that a persisted
 * grade corresponds to a specific composition (Requirement 12.7). Pure — a
 * stable stringification hashed with a simple FNV-1a variant.
 */
export function inputHash(input: GradingInput): string {
  const canonical = JSON.stringify({
    n: input.nutrition,
    i: [...input.ingredients]
      .map((x) => ({ n: x.name, a: x.isAdditive, g: x.isAllergen }))
      .sort((a, b) => a.n.localeCompare(b.n)),
    c: input.composition,
  });
  let h = 0x811c9dc5;
  for (let idx = 0; idx < canonical.length; idx += 1) {
    h ^= canonical.charCodeAt(idx);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
