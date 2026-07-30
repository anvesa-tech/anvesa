import { isValidTransition, type OrderStatus } from '../../domain/orders/statusMachine';
import type {
  CreateOrderInput,
  OrderRepository,
  OrderStatusEventRecord,
} from '../../domain/ports/repositories';

export interface OrderConfirmation {
  id: string;
  items: { variantId: string; qty: number; priceCents: number }[];
  totalCents: number;
  addressId: string;
  slotId: string | null;
  status: string;
}

export type TransitionResult =
  | { ok: true }
  | { ok: false; error: 'INVALID_TRANSITION' | 'NOT_FOUND' };

export type TrackingResult =
  | { ok: true; status: string; history: OrderStatusEventRecord[] }
  | { ok: false; error: 'NOT_OWNER' | 'NOT_FOUND' };

/**
 * Order_Service (Requirement 20, 27.4-27.5). Creates orders with an initial
 * PLACED status, enforces the status state machine, exposes ownership-checked
 * tracking with chronological history, and lists a user's orders recency-first.
 */
export class OrderService {
  constructor(private readonly repo: OrderRepository) {}

  async create(input: CreateOrderInput, now: Date): Promise<OrderConfirmation> {
    const order = await this.repo.create(input);
    await this.repo.appendStatus(order.id, 'PLACED', now);
    return {
      id: order.id,
      items: order.items,
      totalCents: order.totalCents,
      addressId: order.addressId,
      slotId: order.slotId,
      status: 'PLACED',
    };
  }

  async transition(orderId: string, next: OrderStatus, now: Date): Promise<TransitionResult> {
    const order = await this.repo.getById(orderId);
    if (!order) return { ok: false, error: 'NOT_FOUND' };
    if (!isValidTransition(order.status as OrderStatus, next)) {
      return { ok: false, error: 'INVALID_TRANSITION' };
    }
    await this.repo.appendStatus(orderId, next, now);
    return { ok: true };
  }

  async getTracking(userId: string, orderId: string): Promise<TrackingResult> {
    const order = await this.repo.getById(orderId);
    if (!order) return { ok: false, error: 'NOT_FOUND' };
    if (order.userId !== userId) return { ok: false, error: 'NOT_OWNER' };
    const history = [...(await this.repo.getHistory(orderId))].sort(
      (a, b) => a.at.getTime() - b.at.getTime(),
    );
    return { ok: true, status: order.status, history };
  }

  async listOrders(userId: string): Promise<OrderConfirmation[]> {
    const orders = await this.repo.listByUser(userId);
    return [...orders]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((o) => ({
        id: o.id,
        items: o.items,
        totalCents: o.totalCents,
        addressId: o.addressId,
        slotId: o.slotId,
        status: o.status,
      }));
  }
}
