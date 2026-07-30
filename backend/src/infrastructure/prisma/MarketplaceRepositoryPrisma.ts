import type { PrismaClient } from '@prisma/client';
import type { GroupKey, ProductCardDTO } from '../../domain/catalog/types';
import type { MarketplaceRepository } from '../../domain/ports/repositories';

/**
 * Prisma-backed marketplace reads. Excludes products from inactive vendors
 * (Requirement 28.5) and unlisted products, and joins the computed grade and
 * cheapest variant for the card DTO.
 */
export class MarketplaceRepositoryPrisma implements MarketplaceRepository {
  constructor(private readonly db: PrismaClient) {}

  async listByGroup(group: GroupKey, limit: number, cursor?: string): Promise<ProductCardDTO[]> {
    const rows = await this.db.product.findMany({
      where: {
        category: { key: group },
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
      },
      include: {
        brand: true,
        grade: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
      take: limit,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return rows.map((p) => {
      const variant = p.variants[0];
      const price = variant?.priceCents ?? 0;
      const discount = variant?.discountCents ?? 0;
      return {
        id: p.id,
        variantId: variant?.id ?? null,
        name: p.name,
        brand: p.brand.name,
        grade: p.grade?.grade ?? null,
        priceCents: price,
        mrpCents: price + discount,
        discountCents: discount,
        imageUrl: p.images[0]?.url ?? null,
      };
    });
  }
}
