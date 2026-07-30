import type { PrismaClient } from '@prisma/client';
import type { Grade } from '../../domain/grading/types';
import type { ProductCardDTO } from '../../domain/catalog/types';
import type { WishlistRepository } from '../../application/wishlist/WishlistService';

/** Prisma-backed wishlist + recently viewed (Requirement 6, 7). */
export class WishlistRepositoryPrisma implements WishlistRepository {
  constructor(private readonly db: PrismaClient) {}

  async add(userId: string, productId: string): Promise<void> {
    await this.db.savedProduct.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  }

  async remove(userId: string, productId: string): Promise<void> {
    await this.db.savedProduct.deleteMany({ where: { userId, productId } });
  }

  async list(userId: string): Promise<ProductCardDTO[]> {
    const rows = await this.db.savedProduct.findMany({
      where: { userId },
      orderBy: { savedAt: 'desc' },
    });
    return this.cardsFor(rows.map((r) => r.productId));
  }

  async recordView(userId: string, productId: string): Promise<void> {
    await this.db.recentlyViewed.upsert({
      where: { userId_productId: { userId, productId } },
      update: { viewedAt: new Date() },
      create: { userId, productId },
    });
  }

  async recentlyViewed(userId: string, limit: number): Promise<ProductCardDTO[]> {
    const rows = await this.db.recentlyViewed.findMany({
      where: { userId },
      orderBy: { viewedAt: 'desc' },
      take: limit,
    });
    return this.cardsFor(rows.map((r) => r.productId));
  }

  private async cardsFor(productIds: string[]): Promise<ProductCardDTO[]> {
    if (productIds.length === 0) return [];
    const products = await this.db.product.findMany({
      where: { id: { in: productIds } },
      include: {
        brand: true,
        grade: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    // Preserve the requested order (most-recent-first).
    return productIds
      .map((id) => byId.get(id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => {
        const variant = p.variants[0];
        const price = variant?.priceCents ?? 0;
        return {
          id: p.id,
          variantId: variant?.id ?? null,
          name: p.name,
          brand: p.brand.name,
          grade: (p.grade?.grade as Grade | undefined) ?? null,
          priceCents: price,
          mrpCents: price + (variant?.discountCents ?? 0),
          discountCents: variant?.discountCents ?? 0,
          imageUrl: p.images[0]?.url ?? null,
        };
      });
  }
}
