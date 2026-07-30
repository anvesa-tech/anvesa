import type { PrismaClient } from '@prisma/client';
import type { Grade } from '../../domain/grading/types';
import type { ProductCardDTO } from '../../domain/catalog/types';
import type {
  ProductDetailRaw,
  ProductReadRepository,
} from '../../domain/ports/repositories';

/** Prisma-backed product detail reads (Requirement 8). */
export class ProductReadRepositoryPrisma implements ProductReadRepository {
  constructor(private readonly db: PrismaClient) {}

  async getDetail(productId: string): Promise<ProductDetailRaw | null> {
    const p = await this.db.product.findFirst({
      where: {
        id: productId,
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
      },
      include: {
        brand: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
        nutrition: true,
        ingredients: true,
        grade: { include: { reasoning: true } },
        flags: true,
        reviews: { include: { user: true }, orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!p) return null;

    const variant = p.variants[0];
    const price = variant?.priceCents ?? 0;
    return {
      id: p.id,
      variantId: variant?.id ?? null,
      name: p.name,
      brand: p.brand.name,
      categoryId: p.categoryId,
      grade: (p.grade?.grade as Grade | undefined) ?? null,
      priceCents: price,
      discountCents: variant?.discountCents ?? 0,
      imageUrl: p.images[0]?.url ?? null,
      nutrition: p.nutrition
        ? {
            energyKcal: p.nutrition.energyKcal,
            sugarG: p.nutrition.sugarG,
            sodiumMg: p.nutrition.sodiumMg,
            proteinG: p.nutrition.proteinG,
            fatG: p.nutrition.fatG,
            satFatG: p.nutrition.satFatG,
            fibreG: p.nutrition.fibreG,
          }
        : null,
      ingredients: p.ingredients.map((i) => i.name),
      reasoning: (p.grade?.reasoning ?? []).map((r) => ({
        factor: r.factor,
        detail: r.detail,
        weight: r.weight,
      })),
      redFlags: p.flags.map((f) => ({ type: f.type, severity: f.severity, note: f.note })),
      reviews: p.reviews.map((r) => ({
        id: r.id,
        author: r.user.phone ?? r.user.email ?? 'ANVESA user',
        rating: r.rating,
        text: r.text,
      })),
    };
  }

  async findIdByBarcode(barcode: string): Promise<string | null> {
    const p = await this.db.product.findFirst({
      where: {
        barcode,
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
      },
      select: { id: true },
    });
    return p?.id ?? null;
  }

  async topGraded(limit: number): Promise<ProductCardDTO[]> {
    const rows = await this.db.product.findMany({
      where: {
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
        grade: { grade: { in: ['A', 'B'] as never } },
      },
      include: {
        brand: true,
        grade: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
      },
      take: limit,
    });
    const rank: Record<string, number> = { A: 3, B: 2, C: 1, D: 0 };
    return rows
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
      })
      .sort((a, b) => (rank[b.grade ?? 'D'] ?? 0) - (rank[a.grade ?? 'D'] ?? 0));
  }

  async betterAlternatives(
    categoryId: string,
    higherGrades: Grade[],
    excludeId: string,
    limit: number,
  ): Promise<ProductCardDTO[]> {
    if (higherGrades.length === 0) return [];
    const rows = await this.db.product.findMany({
      where: {
        categoryId,
        id: { not: excludeId },
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
        grade: { grade: { in: higherGrades as never } },
      },
      include: {
        brand: true,
        grade: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
      },
      take: limit,
    });

    const rank: Record<string, number> = { A: 3, B: 2, C: 1, D: 0 };
    return rows
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
      })
      .sort((a, b) => (rank[b.grade ?? 'D'] ?? 0) - (rank[a.grade ?? 'D'] ?? 0));
  }
}
