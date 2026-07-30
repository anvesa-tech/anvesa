import type { LabelNutrition } from '@/infrastructure/api/scannerApi';

export interface ParsedLabel {
  ingredients: string;
  nutrition: Partial<Record<keyof LabelNutrition, number>>;
}

/**
 * Parse raw OCR text from a food label into an ingredients string + whatever
 * nutrition values can be recognised. Pure and platform-agnostic so it can be
 * unit-tested and reused across web/native OCR backends (Requirement 10).
 */
export function parseLabelText(raw: string): ParsedLabel {
  const text = raw.replace(/\r/g, '');
  return {
    ingredients: extractIngredients(text),
    nutrition: extractNutrition(text),
  };
}

/** Grab the text following an "INGREDIENTS" heading up to the next section. */
function extractIngredients(text: string): string {
  const m = text.match(/ingredient(?:s)?\s*[:\-]?\s*([\s\S]{0,600})/i);
  if (!m) return '';
  let chunk = m[1] ?? '';
  // Stop at the nutrition panel or the next label section. "energy"/"per 100g"
  // reliably mark the start of the nutrition table (we avoid stopping on words
  // like "salt"/"fat" which are legitimate ingredients).
  const stop = chunk.search(
    /\b(energy|nutrition|nutritional|per\s*100|per\s*serv|%\s*rda|allergen|contains\s|storage|best before|manufactured|marketed|net (?:wt|weight)|directions|how to)\b/i,
  );
  if (stop > 0) chunk = chunk.slice(0, stop);
  return chunk
    .split('\n')
    .join(' ')
    .replace(/^[\s.:;,\-]+/, '') // strip leading punctuation after the heading
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/[.;,]+\s*$/, '')
    .trim();
}

const NUM = '([0-9]+(?:[.,][0-9]+)?)';

function grab(text: string, pattern: RegExp): number | undefined {
  const m = text.match(pattern);
  if (!m || !m[1]) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Best-effort parse of the nutrition panel (per 100g values). */
function extractNutrition(text: string): Partial<Record<keyof LabelNutrition, number>> {
  const out: Partial<Record<keyof LabelNutrition, number>> = {};

  const energy = grab(text, new RegExp(`energy[^0-9]{0,20}${NUM}\\s*k?cal`, 'i')) ??
    grab(text, new RegExp(`${NUM}\\s*kcal`, 'i'));
  if (energy !== undefined) out.energyKcal = energy;

  const sugar = grab(text, new RegExp(`(?:added\\s+)?sugar(?:s)?[^0-9]{0,20}${NUM}\\s*g`, 'i'));
  if (sugar !== undefined) out.sugarG = sugar;

  // Sodium (mg) directly, or derive from salt (g × 400 ≈ mg sodium).
  const sodiumMg = grab(text, new RegExp(`sodium[^0-9]{0,20}${NUM}\\s*mg`, 'i'));
  if (sodiumMg !== undefined) {
    out.sodiumMg = sodiumMg;
  } else {
    const sodiumG = grab(text, new RegExp(`sodium[^0-9]{0,20}${NUM}\\s*g`, 'i'));
    if (sodiumG !== undefined) out.sodiumMg = Math.round(sodiumG * 1000);
    else {
      const saltG = grab(text, new RegExp(`salt[^0-9]{0,20}${NUM}\\s*g`, 'i'));
      if (saltG !== undefined) out.sodiumMg = Math.round((saltG / 2.5) * 1000);
    }
  }

  const protein = grab(text, new RegExp(`protein[^0-9]{0,20}${NUM}\\s*g`, 'i'));
  if (protein !== undefined) out.proteinG = protein;

  const satFat = grab(text, new RegExp(`saturat[^0-9]{0,24}${NUM}\\s*g`, 'i'));
  if (satFat !== undefined) out.satFatG = satFat;

  // Total fat: avoid matching the "saturated fat" line.
  const fat = grab(text, new RegExp(`(?:total\\s+)?fat(?!\\s*ty)(?:[^a-z0-9][^0-9]{0,16})${NUM}\\s*g`, 'i'));
  if (fat !== undefined) out.fatG = fat;

  const fibre = grab(text, new RegExp(`fib(?:re|er)[^0-9]{0,20}${NUM}\\s*g`, 'i'));
  if (fibre !== undefined) out.fibreG = fibre;

  return out;
}
