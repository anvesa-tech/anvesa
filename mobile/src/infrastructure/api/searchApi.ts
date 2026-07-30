import type { Grade, ProductCardModel } from '@/domain/product';
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

const TINTS = ['#EADDFF', '#DFF5E6', '#FFE9D6', '#DDEBFF', '#FDE2F3', '#E8F0D6', '#FFF0CC'];

/** Query the backend Search_Service with a text query and health filters. */
export async function fetchSearch(q: string, filters: string[]): Promise<ProductCardModel[]> {
  const input = encodeURIComponent(JSON.stringify({ json: { q, filters } }));
  const res = await fetch(`${TRPC_URL}/search.query?input=${input}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  const body = (await res.json()) as { result?: { data?: { json?: ProductCardDTO[] } } };
  const rows = body.result?.data?.json ?? [];
  return rows.map((d, i) => ({
    id: d.id,
    variantId: d.variantId,
    name: d.name,
    brand: d.brand,
    grade: d.grade ?? 'B',
    priceCents: d.priceCents,
    mrpCents: d.mrpCents,
    imageColor: TINTS[i % TINTS.length] ?? '#EADDFF',
  }));
}
