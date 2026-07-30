import type { Grade } from '../grading/types';

/** The nine marketplace groups (Requirement 5.1). */
export const GROUP_KEYS = [
  'breakfast',
  'snacks',
  'beverages',
  'staples',
  'kids',
  'protein',
  'organic',
  'dairy',
  'healthy-alternatives',
] as const;

export type GroupKey = (typeof GROUP_KEYS)[number];

/** Product card DTO returned to the client (Requirement 5.2). */
export interface ProductCardDTO {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  grade: Grade | null;
  priceCents: number;
  mrpCents: number;
  discountCents: number;
  imageUrl: string | null;
}

export interface ProductGroupDTO {
  key: GroupKey;
  title: string;
  products: ProductCardDTO[];
}
