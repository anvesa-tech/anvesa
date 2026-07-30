import {
  advanceSchedule,
  shouldGenerate,
  type SubStatus,
} from '../../domain/subscriptions/schedule';

export interface SubscriptionRecord {
  id: string;
  userId: string;
  status: SubStatus;
  nextDeliveryAtMs: number;
  variantIds: string[];
}

export interface SubscriptionRepository {
  listDueCandidates(): Promise<SubscriptionRecord[]>;
  advance(id: string, nextDeliveryAtMs: number): Promise<void>;
  setStatus(id: string, status: SubStatus): Promise<void>;
  createRecurringOrder(sub: SubscriptionRecord): Promise<void>;
  /** The user that owns a subscription, or null if it doesn't exist. */
  getOwnerId(id: string): Promise<string | null>;
}

/**
 * Subscription_Service (Requirement 21). Lifecycle (pause/resume/cancel) and a
 * due-order generator that only fires for ACTIVE subscriptions whose date has
 * arrived, advancing the schedule by 2 days.
 */
export class SubscriptionService {
  constructor(private readonly repo: SubscriptionRepository) {}

  /** Verify the subscription belongs to the user before any state change. */
  private async ownsOrThrow(userId: string, id: string): Promise<void> {
    const owner = await this.repo.getOwnerId(id);
    if (owner !== userId) throw new Error('NOT_OWNER');
  }

  async pause(userId: string, id: string): Promise<void> {
    await this.ownsOrThrow(userId, id);
    return this.repo.setStatus(id, 'PAUSED');
  }
  async resume(userId: string, id: string): Promise<void> {
    await this.ownsOrThrow(userId, id);
    return this.repo.setStatus(id, 'ACTIVE');
  }
  async cancel(userId: string, id: string): Promise<void> {
    await this.ownsOrThrow(userId, id);
    return this.repo.setStatus(id, 'CANCELLED');
  }

  /** Generate due recurring orders (invoked by the scheduled worker). */
  async generateDueOrders(nowMs: number): Promise<number> {
    const subs = await this.repo.listDueCandidates();
    let generated = 0;
    for (const sub of subs) {
      if (!shouldGenerate(sub.status, sub.nextDeliveryAtMs, nowMs)) continue;
      await this.repo.createRecurringOrder(sub);
      await this.repo.advance(sub.id, advanceSchedule(sub.nextDeliveryAtMs));
      generated += 1;
    }
    return generated;
  }
}
