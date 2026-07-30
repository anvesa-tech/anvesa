/**
 * Search text matching and health-filter predicates (Requirement 9). Pure.
 */

export const HEALTH_FILTERS = [
  'Low Sugar',
  'Low Sodium',
  'High Protein',
  'Low Fat',
  'High Fibre',
  'Kids Safe',
  'Diabetic Friendly',
  'Weight Loss',
  'Heart Friendly',
  'Gluten Free',
] as const;

export type HealthFilter = (typeof HEALTH_FILTERS)[number];

export interface FilterableProduct {
  name: string;
  brand: string;
  category: string;
  nutrition: {
    energyKcal: number;
    sugarG: number;
    sodiumMg: number;
    proteinG: number;
    fatG: number;
    satFatG: number;
    fibreG: number;
  } | null;
  ingredientNames: string[];
}

const GLUTEN = /\b(wheat|barley|rye|maida|semolina|malt)\b/i;

/** Case-insensitive "contains" over name, brand, or category (Requirement 9.1). */
export function matchesQuery(product: FilterableProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true; // empty/whitespace → no text filtering (R9.2)
  return (
    product.name.toLowerCase().includes(q) ||
    product.brand.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q)
  );
}

/** True iff a single health filter is satisfied. */
export function matchesFilter(product: FilterableProduct, filter: HealthFilter): boolean {
  const n = product.nutrition;
  if (!n) return false;
  switch (filter) {
    case 'Low Sugar':
      return n.sugarG <= 5;
    case 'Low Sodium':
      return n.sodiumMg <= 120;
    case 'High Protein':
      return n.proteinG >= 8;
    case 'Low Fat':
      return n.fatG <= 3;
    case 'High Fibre':
      return n.fibreG >= 6;
    case 'Kids Safe':
      return n.sugarG <= 10 && !product.ingredientNames.some((i) => /artificial|colour|color|ins /i.test(i));
    case 'Diabetic Friendly':
      return n.sugarG <= 5;
    case 'Weight Loss':
      return n.energyKcal <= 400 && n.sugarG <= 10;
    case 'Heart Friendly':
      return n.satFatG <= 1.5 && n.sodiumMg <= 120;
    case 'Gluten Free':
      return !product.ingredientNames.some((i) => GLUTEN.test(i));
    default:
      return false;
  }
}

/**
 * Apply a query plus a conjunction of filters (Requirement 9.2-9.5).
 * Every returned product matches the query AND every applied filter.
 */
export function filterProducts<T extends FilterableProduct>(
  products: readonly T[],
  query: string,
  filters: readonly HealthFilter[],
): T[] {
  return products.filter(
    (p) => matchesQuery(p, query) && filters.every((f) => matchesFilter(p, f)),
  );
}
