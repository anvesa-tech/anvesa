import type { Grade, ProductCardModel, ProductGroup, GroupKey } from '@/domain/product';
import { TRPC_URL } from './config';

/** Shape returned by the backend Marketplace_Service (ProductCardDTO). */
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

interface ProductGroupDTO {
  key: GroupKey;
  title: string;
  products: ProductCardDTO[];
}

const TINTS = ['#EADDFF', '#DFF5E6', '#FFE9D6', '#DDEBFF', '#FDE2F3', '#E8F0D6', '#FFF0CC'];

function toCardModel(dto: ProductCardDTO, index: number): ProductCardModel {
  return {
    id: dto.id,
    variantId: dto.variantId,
    name: dto.name,
    brand: dto.brand,
    grade: dto.grade ?? 'B',
    priceCents: dto.priceCents,
    mrpCents: dto.mrpCents,
    imageColor: TINTS[index % TINTS.length] ?? '#EADDFF',
  };
}

/**
 * Fetch the marketplace home groups from the backend tRPC endpoint.
 * Uses the tRPC GET/query wire format (result.data.json with superjson).
 */
export async function fetchHomeGroups(): Promise<ProductGroup[]> {
  const res = await fetch(`${TRPC_URL}/marketplace.homeGroups`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Marketplace request failed: ${res.status}`);
  const body = (await res.json()) as { result?: { data?: { json?: ProductGroupDTO[] } } };
  const groups = body.result?.data?.json;
  if (!groups) throw new Error('Malformed marketplace response');

  return groups.map((g) => ({
    key: g.key,
    title: g.title,
    products: g.products.map(toCardModel),
  }));
}
