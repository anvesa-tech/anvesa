import type { PrismaClient } from '@prisma/client';
import type { BundleRepository, BundleView } from '../../application/bundle/BundleService';

/** Prisma-backed bundles with per-product stock availability (Requirement 22). */
export class BundleRepositoryPrisma implements BundleRepository {
  constructor(private readonly db: PrismaClient) {}

  async listBundles(): Promise<BundleView[]> {
    const bundles = await this.db.bundle.findMany({ include: { products: true } });
    const views: BundleView[] = [];
    for (const b of bundles) {
      const products: BundleView['products'] = [];
      for (const bp of b.products) {
        const product = await this.db.product.findUnique({
          where: { id: bp.productId },
          include: { variants: true },
        });
        if (!product) continue;
        const inStock = product.variants.some((v) => v.stock > 0);
        products.push({ productId: product.id, name: product.name, inStock });
      }
      views.push({ id: b.id, key: b.key, name: b.name, priceCents: b.priceCents, products });
    }
    return views;
  }
}
