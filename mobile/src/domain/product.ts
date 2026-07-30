/**
 * Client-side domain models for the marketplace.
 * Mirrors the backend ProductCard/Grade shape from the design.
 */

export type Grade = 'A' | 'B' | 'C' | 'D';

export type GroupKey =
  | 'breakfast'
  | 'snacks'
  | 'beverages'
  | 'staples'
  | 'kids'
  | 'protein'
  | 'organic'
  | 'dairy'
  | 'healthy-alternatives';

export interface ProductCardModel {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  grade: Grade;
  priceCents: number;
  mrpCents: number;
  imageColor: string; // placeholder tint until real product photography is wired
}

export interface ProductGroup {
  key: GroupKey;
  title: string;
  products: ProductCardModel[];
}

export function formatINR(cents: number): string {
  return `₹${(cents / 100).toFixed(0)}`;
}

export function discountPercent(priceCents: number, mrpCents: number): number {
  if (mrpCents <= 0 || priceCents >= mrpCents) return 0;
  return Math.round(((mrpCents - priceCents) / mrpCents) * 100);
}
