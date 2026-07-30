import type { PrismaClient } from '@prisma/client';
import type { RewardsRepository } from '../../domain/ports/repositories';
import type { RewardsLeaderboardRepository } from '../../application/rewards/RewardsService';
import type { LeaderboardEntry } from '../../domain/rewards/leaderboard';

/** Prisma-backed rewards (Requirement 23, 24). */
export class RewardsRepositoryPrisma implements RewardsRepository, RewardsLeaderboardRepository {
  constructor(private readonly db: PrismaClient) {}

  async hasScanReward(userId: string, productId: string, utcDay: string): Promise<boolean> {
    const row = await this.db.scanReward.findUnique({
      where: { userId_productId_utcDay: { userId, productId, utcDay } },
    });
    return !!row;
  }

  async recordScanReward(
    userId: string,
    productId: string,
    utcDay: string,
    xp: number,
  ): Promise<void> {
    await this.db.scanReward.create({ data: { userId, productId, utcDay, xpAwarded: xp } });
    await this.db.scanHistory.create({ data: { userId, productId, utcDay } });
  }

  async addXp(userId: string, xp: number): Promise<void> {
    await this.db.xp.upsert({
      where: { userId },
      update: { total: { increment: xp } },
      create: { userId, total: xp },
    });
  }

  async grantBadgeOnce(userId: string, key: string): Promise<boolean> {
    try {
      await this.db.badge.create({ data: { userId, key } });
      return true;
    } catch {
      return false; // unique constraint → already granted
    }
  }

  async getStreak(userId: string): Promise<{ scanStreak: number; lastScanDay: string | null } | null> {
    const s = await this.db.streak.findUnique({ where: { userId } });
    return s ? { scanStreak: s.scanStreak, lastScanDay: s.lastScanDay } : null;
  }

  async setScanStreak(userId: string, streak: number, day: string): Promise<void> {
    await this.db.streak.upsert({
      where: { userId },
      update: { scanStreak: streak, lastScanDay: day },
      create: { userId, scanStreak: streak, lastScanDay: day },
    });
  }

  async topEntries(limit: number): Promise<LeaderboardEntry[]> {
    const rows = await this.db.xp.findMany({ orderBy: { total: 'desc' }, take: limit });
    return rows.map((x) => ({ userId: x.userId, xp: x.total, reachedAtMs: x.reachedAt.getTime() }));
  }
}
