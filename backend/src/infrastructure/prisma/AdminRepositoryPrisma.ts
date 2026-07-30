import type { PrismaClient } from '@prisma/client';
import type { AdminRepository } from '../../application/admin/AdminService';

/** Prisma-backed admin analytics + listings (Requirement 27). */
export class AdminRepositoryPrisma implements AdminRepository {
  constructor(private readonly db: PrismaClient) {}

  countProducts(): Promise<number> {
    return this.db.product.count();
  }
  countOrders(): Promise<number> {
    return this.db.order.count();
  }
  countCustomers(): Promise<number> {
    return this.db.user.count({ where: { isGuest: false } });
  }
  async sumXp(): Promise<number> {
    const agg = await this.db.xp.aggregate({ _sum: { total: true } });
    return agg._sum.total ?? 0;
  }
  async listOrders(
    limit: number,
  ): Promise<{ id: string; status: string; totalCents: number; createdAt: Date }[]> {
    const rows = await this.db.order.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    return rows.map((o) => ({
      id: o.id,
      status: o.status,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
    }));
  }

  async listProducts(
    limit: number,
  ): Promise<{ id: string; name: string; brand: string; grade: string | null; isListed: boolean }[]> {
    const rows = await this.db.product.findMany({
      orderBy: { name: 'asc' },
      take: limit,
      include: { brand: true, grade: true },
    });
    return rows.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand.name,
      grade: p.grade?.grade ?? null,
      isListed: p.isListed,
    }));
  }

  async setProductListed(productId: string, isListed: boolean): Promise<void> {
    await this.db.product.update({ where: { id: productId }, data: { isListed } });
  }
}
