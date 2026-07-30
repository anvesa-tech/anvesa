import type { ProductDetailModel } from '@/domain/productDetail';
import { TRPC_URL } from './config';

interface ProductDetailDTO {
  id: string;
  variantId: string | null;
  name: string;
  brand: string;
  grade: 'A' | 'B' | 'C' | 'D' | null;
  priceCents: number;
  mrpCents: number;
  discountCents: number;
  imageUrl: string | null;
  gradeExplanation: string;
  nutrition: { label: string; value: string; tone: 'good' | 'neutral' | 'bad' }[];
  ingredients: string[];
  gradeReasoning: { factor: string; detail: string; tone: 'good' | 'neutral' | 'bad' }[];
  redFlags: { title: string; note: string; severity: 'low' | 'medium' | 'high' }[];
  betterAlternatives: {
    id: string;
    variantId: string | null;
    name: string;
    brand: string;
    grade: 'A' | 'B' | 'C' | 'D' | null;
    priceCents: number;
    mrpCents: number;
  }[];
  reviews: { id: string; author: string; rating: number; text: string }[];
  source: 'anvesa' | 'external';
  amazonUrl: string | null;
}

const TINTS = ['#EADDFF', '#DFF5E6', '#FFE9D6', '#DDEBFF', '#FDE2F3', '#E8F0D6', '#FFF0CC'];

export type ScanResult =
  | { found: true; product: ProductDetailModel }
  | { found: false };

/** Look up a scanned barcode against the ANVESA catalog (Requirement 10). */
export async function lookupBarcode(barcode: string): Promise<ScanResult> {
  const input = encodeURIComponent(JSON.stringify({ json: { barcode } }));
  const res = await fetch(`${TRPC_URL}/scanner.lookup?input=${input}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Scan lookup failed: ${res.status}`);
  const body = (await res.json()) as {
    result?: { data?: { json?: { found: boolean; product?: ProductDetailDTO } } };
  };
  const data = body.result?.data?.json;
  if (!data || !data.found || !data.product) return { found: false };
  return { found: true, product: toModel(data.product) };
}

function toModel(d: ProductDetailDTO): ProductDetailModel {
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
    betterAlternatives: d.betterAlternatives.map((a, i) => ({
      id: a.id,
      variantId: a.variantId,
      name: a.name,
      brand: a.brand,
      grade: a.grade ?? 'B',
      priceCents: a.priceCents,
      mrpCents: a.mrpCents,
      imageColor: TINTS[i % TINTS.length] ?? '#EADDFF',
    })),
    reviews: d.reviews,
    source: d.source,
    amazonUrl: d.amazonUrl,
  };
}

export interface LabelNutrition {
  energyKcal: number;
  sugarG: number;
  sodiumMg: number;
  proteinG: number;
  fatG: number;
  satFatG: number;
  fibreG: number;
}

export interface LabelInput {
  name?: string;
  brand?: string;
  ingredientsText: string;
  nutrition: LabelNutrition;
}

/**
 * Read the text off a photographed food label via server-side OCR (R10).
 * Returns the raw recognised text; the caller parses it into fields.
 */
export async function readLabelImage(imageBase64: string): Promise<string> {
  const res = await fetch(`${TRPC_URL}/scanner.readLabel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { imageBase64 } }),
  });
  if (!res.ok) throw new Error(`Label OCR failed: ${res.status}`);
  const body = (await res.json()) as {
    result?: { data?: { json?: { text?: string } } };
  };
  return body.result?.data?.json?.text ?? '';
}

/**
 * Analyse a food label's ingredients + nutrition (Requirement 10). Grades the
 * composition with ANVESA's own engine — works for any product, even without a
 * barcode match.
 */
export async function analyzeLabel(input: LabelInput): Promise<ProductDetailModel> {
  const res = await fetch(`${TRPC_URL}/scanner.analyzeLabel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: input }),
  });
  if (!res.ok) throw new Error(`Label analysis failed: ${res.status}`);
  const body = (await res.json()) as {
    result?: { data?: { json?: { found: boolean; product?: ProductDetailDTO } } };
  };
  const product = body.result?.data?.json?.product;
  if (!product) throw new Error('Label analysis returned no product');
  return toModel(product);
}
