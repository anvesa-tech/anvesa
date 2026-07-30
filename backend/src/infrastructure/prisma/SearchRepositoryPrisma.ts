import type { PrismaClient } from '@prisma/client';
import type { Grade } from '../../domain/grading/types';
import type { SearchRepository, SearchableProductRow } from '../../domain/ports/repositories';

/** Prisma-backed search candidates (Requirement 9, 28.5). */
export class SearchRepositoryPrisma implements SearchRepository {
  constructor(private readonly db: PrismaClient) {}

  async listSearchable(limit: number): Promise<SearchableProductRow[]> {
    const rows = await this.db.product.findMany({
      where: {
        isListed: true,
        OR: [{ vendor: null }, { vendor: { isActive: true } }],
      },
      include: {
        brand: true,
        category: true,
        grade: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { orderBy: { priceCents: 'asc' }, take: 1 },
        nutrition: true,
        ingredients: true,
      },
      take: limit,
    });

    return rows.map((p) => {
      const variant = p.variants[0];
      const price = variant?.priceCents ?? 0;
      return {
        card: {
          id: p.id,
          variantId: variant?.id ?? null,
          name: p.name,
          brand: p.brand.name,
          grade: (p.grade?.grade as Grade | undefined) ?? null,
          priceCents: price,
          mrpCents: price + (variant?.discountCents ?? 0),
          discountCents: variant?.discountCents ?? 0,
          imageUrl: p.images[0]?.url ?? null,
        },
        filterable: {
          name: p.name,
          brand: p.brand.name,
          category: p.category.name,
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
          ingredientNames: p.ingredients.map((i) => i.name),
        },
      };
    });
  }
}
