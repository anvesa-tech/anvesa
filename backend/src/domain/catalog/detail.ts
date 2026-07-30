import type { Grade } from '../grading/types';
import type { ProductCardDTO } from './types';

/** Product detail DTO (Requirement 8). */
export interface NutritionRowDTO {
  label: string;
  value: string;
  tone: 'good' | 'neutral' | 'bad';
}

export interface GradeFactorDTO {
  factor: string;
  detail: string;
  tone: 'good' | 'neutral' | 'bad';
}

export interface RedFlagDTO {
  title: string;
  note: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReviewDTO {
  id: string;
  author: string;
  rating: number;
  text: string;
}

export interface ProductDetailDTO {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  grade: Grade | null;
  priceCents: number;
  mrpCents: number;
  discountCents: number;
  imageUrl: string | null;
  gradeExplanation: string;
  nutrition: NutritionRowDTO[];
  ingredients: string[];
  gradeReasoning: GradeFactorDTO[];
  redFlags: RedFlagDTO[];
  betterAlternatives: ProductCardDTO[];
  reviews: ReviewDTO[];
  /** 'anvesa' = in our catalog; 'external' = graded from Open Food Facts. */
  source: 'anvesa' | 'external';
  /** Amazon affiliate search link for external products not sold by ANVESA. */
  amazonUrl: string | null;
}
