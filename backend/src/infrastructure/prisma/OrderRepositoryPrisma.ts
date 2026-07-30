import type { PrismaClient, OrderStatus as PrismaOrderStatus } from '@prisma/client';
import type {
  CreateOrderInput,
  OrderRecord,
  OrderRepository,
  OrderStatusEventRecord,
} from '../../domain/ports/repositories';

/** Prisma-backed orders (Requirement 20). */
export class OrderRepositoryPrisma implements OrderRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(input: CreateOrderInput): Promise<OrderRecord> {
    const order = await this.db.order.create({
      data: {
        userId: input.userId,
        status: 'PLACED',
        subtotalCents: input.subtotalCents,
        discountCents: input.discountCents,
        walletCents: input.walletCents,
        deliveryCents: input.deliveryCents,
        totalCents: input.totalCents,
        addressId: input.addressId,
        slotId: input.slotId,
        items: {
          create: input.items.map((i) => ({
            variantId: i.variantId,
            qty: i.qty,
            priceCents: i.priceCents,
          })),
        },
      },
      include: { items: true },
    });
    return this.toRecord(order);
  }

  async appendStatus(orderId: string, status: string, at: Date): Promise<void> {
    await this.db.$transaction([
      this.db.orderStatusEvent.create({
        data: { orderId, status: status as PrismaOrderStatus, at },
      }),
      this.db.order.update({
        where: { id: orderId },
        data: { status: status as PrismaOrderStatus },
      }),
    ]);
  }

  async getById(orderId: string): Promise<OrderRecord | null> {
    const order = await this.db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    return order ? this.toRecord(order) : null;
  }

  async getHistory(orderId: string): Promise<OrderStatusEventRecord[]> {
    const events = await this.db.orderStatusEvent.findMany({
      where: { orderId },
      orderBy: { at: 'asc' },
    });
    return events.map((e) => ({ status: e.status, at: e.at }));
  }

  async listByUser(userId: string): Promise<OrderRecord[]> {
    const orders = await this.db.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return orders.map((o) => this.toRecord(o));
  }

  private toRecord(o: {
    id: string;
    userId: string;
    status: string;
    totalCents: number;
    addressId: string;
    slotId: string | null;
    createdAt: Date;
    items: { variantId: string; qty: number; priceCents: number }[];
  }): OrderRecord {
    return {
      id: o.id,
      userId: o.userId,
      status: o.status,
      totalCents: o.totalCents,
      addressId: o.addressId,
      slotId: o.slotId,
      items: o.items.map((i) => ({ variantId: i.variantId, qty: i.qty, priceCents: i.priceCents })),
      createdAt: o.createdAt,
    };
  }
}
