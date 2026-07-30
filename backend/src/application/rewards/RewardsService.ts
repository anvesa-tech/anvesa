import { nextStreak, shouldAwardScan } from '../../domain/rewards/streak';
import { rankLeaderboard, type LeaderboardEntry } from '../../domain/rewards/leaderboard';
import type { RewardsRepository } from '../../domain/ports/repositories';

export const SCAN_XP = 10;
export const PURCHASE_XP = 50;

export interface RewardsLeaderboardRepository {
  topEntries(limit: number): Promise<LeaderboardEntry[]>;
}

/**
 * Rewards_Service (Requirement 23, 24). Scan/purchase XP with per-day scan
 * dedupe, consecutive-day streaks, exactly-once badge grants, and the
 * top-100 leaderboard.
 */
export class RewardsService {
  constructor(
    private readonly repo: RewardsRepository,
    private readonly leaderboardRepo: RewardsLeaderboardRepository,
  ) {}

  /** Award XP for a scan unless already rewarded for this product today. */
  async awardScan(userId: string, productId: string, utcDay: string): Promise<{ awarded: boolean }> {
    const already = await this.repo.hasScanReward(userId, productId, utcDay);
    if (!shouldAwardScan(already)) return { awarded: false };
    await this.repo.recordScanReward(userId, productId, utcDay, SCAN_XP);
    await this.repo.addXp(userId, SCAN_XP);
    await this.bumpScanStreak(userId, utcDay);
    return { awarded: true };
  }

  async awardPurchase(userId: string): Promise<void> {
    await this.repo.addXp(userId, PURCHASE_XP);
  }

  /** Grant a badge at most once (idempotent via the repository unique key). */
  async grantBadge(userId: string, key: string): Promise<boolean> {
    return this.repo.grantBadgeOnce(userId, key);
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    return rankLeaderboard(await this.leaderboardRepo.topEntries(100));
  }

  private async bumpScanStreak(userId: string, utcDay: string): Promise<void> {
    const streak = await this.repo.getStreak(userId);
    const next = nextStreak(streak?.lastScanDay ?? null, utcDay, streak?.scanStreak ?? 0);
    await this.repo.setScanStreak(userId, next, utcDay);
  }
}
