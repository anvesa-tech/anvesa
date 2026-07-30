import type { PrismaClient } from '@prisma/client';
import type {
  DeliveryRepository,
  DeliverySlotView,
} from '../../application/delivery/DeliveryService';

/** Prisma-backed delivery slots + pincode registration (Requirement 18, 19). */
export class DeliveryRepositoryPrisma implements DeliveryRepository {
  constructor(private readonly db: PrismaClient) {}

  async registerPincode(userId: string, code: string): Promise<void> {
    await this.db.pincode.upsert({
      where: { userId_code: { userId, code } },
      update: {},
      create: { userId, code },
    });
  }

  async listSlotsNext7Days(nowMs: number): Promise<DeliverySlotView[]> {
    const now = new Date(nowMs);
    const in7 = new Date(nowMs + 7 * 86_400_000);
    const rows = await this.db.deliverySlot.findMany({
      where: { startAt: { gte: now, lte: in7 } },
      orderBy: { startAt: 'asc' },
    });
    return rows.map((s) => ({
      id: s.id,
      startAtMs: s.startAt.getTime(),
      endAtMs: s.endAt.getTime(),
      capacity: s.capacity,
      reserved: s.reserved,
    }));
  }

  async getSlot(slotId: string): Promise<DeliverySlotView | null> {
    const s = await this.db.deliverySlot.findUnique({ where: { id: slotId } });
    return s
      ? {
          id: s.id,
          startAtMs: s.startAt.getTime(),
          endAtMs: s.endAt.getTime(),
          capacity: s.capacity,
          reserved: s.reserved,
        }
      : null;
  }
}
