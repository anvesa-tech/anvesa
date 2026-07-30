import type { Grade, ProductCardModel } from './product';

/**
 * Product detail domain models, mirroring the backend Product_Service detail
 * response (Requirement 8): nutrition, ingredients, grade + reasoning,
 * red flags, better alternatives, reviews, related products.
 */

export interface NutritionRow {
  label: string;
  value: string;
  /** semantic quality for color coding: good | neutral | bad */
  tone: 'good' | 'neutral' | 'bad';
}

export interface GradeFactor {
  factor: string;
  detail: string;
  tone: 'good' | 'neutral' | 'bad';
}

export interface RedFlag {
  title: string;
  note: string;
  severity: 'low' | 'medium' | 'high';
}

export interface Review {
  id: string;
  author: string;
  rating: number; // 1..5
  text: string;
}

export interface ProductDetailModel {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  grade: Grade;
  priceCents: number;
  mrpCents: number;
  imageColor: string;
  gradeExplanation: string;
  nutrition: NutritionRow[];
  ingredients: string[];
  gradeReasoning: GradeFactor[];
  redFlags: RedFlag[];
  betterAlternatives: ProductCardModel[];
  reviews: Review[];
  /** Where the product came from: the ANVESA catalog or an external database. */
  source?: 'anvesa' | 'external';
  /** Amazon fallback link for products not sold on ANVESA (external scans). */
  amazonUrl?: string | null;
}
