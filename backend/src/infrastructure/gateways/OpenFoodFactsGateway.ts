import type { ExternalProductData, ProductDataGateway } from '../../domain/ports/gateways';
import type { IngredientRef } from '../../domain/grading/types';

/**
 * Open Food Facts gateway (Requirement 10). Free, no-API-key product database.
 * Resolves a barcode to composition data (nutrition + ingredients) which the
 * Grading_Engine then grades objectively — we never use their score.
 */
interface OffNutriments {
  'energy-kcal_100g'?: number;
  sugars_100g?: number;
  sodium_100g?: number;
  salt_100g?: number;
  proteins_100g?: number;
  fat_100g?: number;
  'saturated-fat_100g'?: number;
  fiber_100g?: number;
}

interface OffProduct {
  product_name?: string;
  brands?: string;
  image_url?: string;
  ingredients_text?: string;
  additives_tags?: string[];
  nova_group?: number;
  nutriments?: OffNutriments;
}

const num = (v: number | undefined, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;

export class OpenFoodFactsGateway implements ProductDataGateway {
  private readonly base = 'https://world.openfoodfacts.org/api/v2';

  async lookupByBarcode(barcode: string): Promise<ExternalProductData | null> {
    const fields =
      'product_name,brands,image_url,ingredients_text,additives_tags,nova_group,nutriments';
    let res: Response;
    try {
      res = await fetch(`${this.base}/product/${encodeURIComponent(barcode)}.json?fields=${fields}`, {
        headers: { 'User-Agent': 'ANVESA/1.0 (clean-food marketplace)' },
      });
    } catch {
      return null;
    }
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: number; product?: OffProduct };
    if (body.status !== 1 || !body.product) return null;

    const p = body.product;
    const n = p.nutriments ?? {};

    // Sodium in mg: prefer sodium_100g (g), else derive from salt (salt/2.5).
    const sodiumG = n.sodium_100g ?? (n.salt_100g !== undefined ? n.salt_100g / 2.5 : 0);
    const additives = p.additives_tags ?? [];
    const ingredientsText = p.ingredients_text ?? '';

    const ingredients: IngredientRef[] = [
      ...additives.map((tag) => ({
        name: tag.replace(/^en:/, '').toUpperCase(),
        isAdditive: true,
        isAllergen: false,
      })),
      ...ingredientsText
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 40)
        .slice(0, 12)
        .map((name) => ({ name, isAdditive: false, isAllergen: false })),
    ];

    const nova = num(p.nova_group, additives.length > 0 ? 4 : 1);
    const hasAddedSugar = /sugar|sucre|syrup|glucose|fructose|sirop/i.test(ingredientsText);
    const wholeFoodRatio = Math.max(0, 1 - Math.min(additives.length / 5, 1));

    return {
      name: p.product_name || 'Scanned product',
      brand: p.brands ? p.brands.split(',')[0]!.trim() : 'Unknown brand',
      imageUrl: p.image_url ?? null,
      input: {
        nutrition: {
          energyKcal: num(n['energy-kcal_100g']),
          sugarG: num(n.sugars_100g),
          sodiumMg: num(sodiumG) * 1000,
          proteinG: num(n.proteins_100g),
          fatG: num(n.fat_100g),
          satFatG: num(n['saturated-fat_100g']),
          fibreG: num(n.fiber_100g),
        },
        ingredients,
        composition: {
          wholeFoodRatio,
          processingLevel: Math.min(4, Math.max(0, nova)),
          hasAddedSugar,
        },
      },
    };
  }
}
