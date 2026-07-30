import type { PrismaClient } from '@prisma/client';
import type { WalletRepository } from '../../domain/ports/repositories';

/** Prisma-backed wallet (Requirement 15). Balance + transaction ledger. */
export class WalletRepositoryPrisma implements WalletRepository {
  constructor(private readonly db: PrismaClient) {}

  async getBalance(userId: string): Promise<number> {
    const w = await this.db.wallet.findUnique({ where: { userId } });
    return w?.balanceCents ?? 0;
  }

  async applyDebit(userId: string, amountCents: number, reason: string): Promise<void> {
    if (amountCents <= 0) return;
    await this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCents: 0 },
      });
      if (wallet.balanceCents < amountCents) {
        throw new Error('Insufficient wallet balance');
      }
      await tx.wallet.update({
        where: { userId },
        data: { balanceCents: { decrement: amountCents } },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, amountCents, type: 'DEBIT', reason },
      });
    });
  }

  async applyCredit(
    userId: string,
    amountCents: number,
    reason: string,
    idempotencyKey: string,
  ): Promise<void> {
    if (amountCents <= 0) return;
    await this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {},
        create: { userId, balanceCents: 0 },
      });
      // Idempotency: skip if this credit was already applied.
      const existing = await tx.walletTransaction.findUnique({ where: { idempotencyKey } });
      if (existing) return;
      await tx.wallet.update({
        where: { userId },
        data: { balanceCents: { increment: amountCents } },
      });
      await tx.walletTransaction.create({
        data: { walletId: wallet.id, amountCents, type: 'CREDIT', reason, idempotencyKey },
      });
    });
  }
}
