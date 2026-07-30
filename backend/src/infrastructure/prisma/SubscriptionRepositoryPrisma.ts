import type { PrismaClient, SubStatus as PrismaSubStatus } from '@prisma/client';
import type {
  SubscriptionRecord,
  SubscriptionRepository,
} from '../../application/subscription/SubscriptionService';
import type { SubStatus } from '../../domain/subscriptions/schedule';

/** Prisma-backed subscriptions (Requirement 21). */
export class SubscriptionRepositoryPrisma implements SubscriptionRepository {
  constructor(private readonly db: PrismaClient) {}

  async listDueCandidates(): Promise<SubscriptionRecord[]> {
    const subs = await this.db.subscription.findMany({
      where: { status: 'ACTIVE', nextDeliveryAt: { lte: new Date() } },
      include: { items: true },
    });
    return subs.map((s) => ({
      id: s.id,
      userId: s.userId,
      status: s.status as SubStatus,
      nextDeliveryAtMs: s.nextDeliveryAt.getTime(),
      variantIds: s.items.map((i) => i.variantId),
    }));
  }

  async advance(id: string, nextDeliveryAtMs: number): Promise<void> {
    await this.db.subscription.update({
      where: { id },
      data: { nextDeliveryAt: new Date(nextDeliveryAtMs) },
    });
  }

  async setStatus(id: string, status: SubStatus): Promise<void> {
    await this.db.subscription.update({
      where: { id },
      data: { status: status as PrismaSubStatus },
    });
  }

  async getOwnerId(id: string): Promise<string | null> {
    const s = await this.db.subscription.findUnique({ where: { id }, select: { userId: true } });
    return s?.userId ?? null;
  }

  async createRecurringOrder(sub: SubscriptionRecord): Promise<void> {
    // Generate a lightweight recurring order from in-stock subscription items.
    const items: { variantId: string; qty: number; priceCents: number }[] = [];
    let subtotal = 0;
    for (const variantId of sub.variantIds) {
      const v = await this.db.productVariant.findUnique({ where: { id: variantId } });
      if (v && v.stock > 0) {
        items.push({ variantId, qty: 1, priceCents: v.priceCents });
        subtotal += v.priceCents;
      }
    }
    if (items.length === 0) return;
    await this.db.order.create({
      data: {
        userId: sub.userId,
        status: 'PLACED',
        subtotalCents: subtotal,
        totalCents: subtotal,
        addressId: 'subscription-default',
        items: { create: items },
        history: { create: { status: 'PLACED' } },
      },
    });
  }
}
