import type { Grade, ProductCardModel } from '@/domain/product';
import type { ProductDetailModel } from '@/domain/productDetail';
import { TRPC_URL } from './config';

interface ProductCardDTO {
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

interface ProductDetailDTO {
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
  nutrition: { label: string; value: string; tone: 'good' | 'neutral' | 'bad' }[];
  ingredients: string[];
  gradeReasoning: { factor: string; detail: string; tone: 'good' | 'neutral' | 'bad' }[];
  redFlags: { title: string; note: string; severity: 'low' | 'medium' | 'high' }[];
  betterAlternatives: ProductCardDTO[];
  reviews: { id: string; author: string; rating: number; text: string }[];
}

const TINTS = ['#EADDFF', '#DFF5E6', '#FFE9D6', '#DDEBFF', '#FDE2F3', '#E8F0D6', '#FFF0CC'];

function altToCard(dto: ProductCardDTO, i: number): ProductCardModel {
  return {
    id: dto.id,
    variantId: dto.variantId,
    name: dto.name,
    brand: dto.brand,
    grade: dto.grade ?? 'B',
    priceCents: dto.priceCents,
    mrpCents: dto.mrpCents,
    imageColor: TINTS[i % TINTS.length] ?? '#EADDFF',
  };
}

/** Fetch a product's full detail from the backend Product_Service. */
export async function fetchProductDetail(id: string): Promise<ProductDetailModel | null> {
  const input = encodeURIComponent(JSON.stringify({ json: { id } }));
  const res = await fetch(`${TRPC_URL}/product.byId?input=${input}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Product request failed: ${res.status}`);
  const body = (await res.json()) as {
    result?: { data?: { json?: ProductDetailDTO | null } };
  };
  const d = body.result?.data?.json;
  if (!d) return null;

  return {
    id: d.id,
    variantId: d.variantId,
    name: d.name,
    brand: d.brand,
    grade: d.grade ?? 'B',
    priceCents: d.priceCents,
    mrpCents: d.mrpCents,
    imageColor: '#EADDFF',
    gradeExplanation: d.gradeExplanation,
    nutrition: d.nutrition,
    ingredients: d.ingredients,
    gradeReasoning: d.gradeReasoning,
    redFlags: d.redFlags,
    betterAlternatives: d.betterAlternatives.map(altToCard),
    reviews: d.reviews,
  };
}
