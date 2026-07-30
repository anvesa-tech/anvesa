import type { PrismaClient } from '@prisma/client';
import type { CouponRepository } from '../../domain/ports/repositories';

/** Prisma-backed coupons (Requirement 14). */
export class CouponRepositoryPrisma implements CouponRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByCode(code: string): Promise<{
    code: string;
    type: 'PERCENT' | 'FLAT';
    value: number;
    minOrderCents: number;
    usageLimit: number;
    usedCount: number;
    expiresAt: Date;
    isActive: boolean;
  } | null> {
    const c = await this.db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!c) return null;
    return {
      code: c.code,
      type: c.type,
      value: c.value,
      minOrderCents: c.minOrderCents,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      expiresAt: c.expiresAt,
      isActive: c.isActive,
    };
  }

  async incrementUsage(code: string): Promise<void> {
    await this.db.coupon.update({
      where: { code: code.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    });
  }
}
