import type { PrismaClient, Grade as PrismaGrade } from '@prisma/client';
import type { Grade } from '../../domain/grading/types';
import type {
  GradeRecord,
  ProductCompositionRecord,
  ProductRepository,
} from '../../domain/ports/repositories';

/**
 * Prisma-backed ProductRepository (Requirement 31.3). Reads composition inputs
 * for the Grading_Engine and persists computed grades. This adapter is the
 * only code that translates between Prisma rows and domain records for grading.
 */
export class ProductRepositoryPrisma implements ProductRepository {
  constructor(private readonly db: PrismaClient) {}

  async getComposition(productId: string): Promise<ProductCompositionRecord | null> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: { nutrition: true, ingredients: true },
    });
    if (!product || !product.nutrition) return null;

    const n = product.nutrition;
    const additiveCount = product.ingredients.filter((i) => i.isAdditive).length;
    const total = product.ingredients.length || 1;

    return {
      productId,
      input: {
        nutrition: {
          energyKcal: n.energyKcal,
          sugarG: n.sugarG,
          sodiumMg: n.sodiumMg,
          proteinG: n.proteinG,
          fatG: n.fatG,
          satFatG: n.satFatG,
          fibreG: n.fibreG,
        },
        ingredients: product.ingredients.map((i) => ({
          name: i.name,
          isAdditive: i.isAdditive,
          isAllergen: i.isAllergen,
        })),
        composition: {
          wholeFoodRatio: Math.max(0, 1 - additiveCount / total),
          processingLevel: Math.min(4, additiveCount),
          hasAddedSugar: product.ingredients.some((i) =>
            /sugar|syrup|glucose|fructose/i.test(i.name),
          ),
        },
      },
    };
  }

  async persistGrade(record: GradeRecord): Promise<void> {
    const grade = record.grade as PrismaGrade;
    await this.db.$transaction(async (tx) => {
      const existing = await tx.productGrade.findUnique({
        where: { productId: record.productId },
      });
      if (existing) {
        await tx.gradeReasoning.deleteMany({ where: { gradeId: existing.id } });
        await tx.productGrade.update({
          where: { productId: record.productId },
          data: {
            grade,
            inputHash: record.inputHash,
            computedAt: new Date(),
            reasoning: { create: record.reasoning },
          },
        });
      } else {
        await tx.productGrade.create({
          data: {
            productId: record.productId,
            grade,
            inputHash: record.inputHash,
            reasoning: { create: record.reasoning },
          },
        });
      }
      // Replace red-flag rows for the product.
      await tx.productFlag.deleteMany({ where: { productId: record.productId } });
      if (record.redFlags.length > 0) {
        await tx.productFlag.createMany({
          data: record.redFlags.map((f) => ({
            productId: record.productId,
            type: f.type,
            severity: f.severity,
            note: f.note,
          })),
        });
      }
    });
  }

  async getGrade(productId: string): Promise<Grade | null> {
    const row = await this.db.productGrade.findUnique({ where: { productId } });
    return row ? (row.grade as Grade) : null;
  }
}
