import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { RewardsService } from './RewardsService';
import type { RewardsRepository } from '../../domain/ports/repositories';
import type { LeaderboardEntry } from '../../domain/rewards/leaderboard';

const RUNS = { numRuns: 100 };

function build(opts: { failXp?: boolean } = {}) {
  const badges = new Set<string>();
  const xp = new Map<string, number>();
  const scanRewards = new Set<string>();
  const repo: RewardsRepository = {
    async hasScanReward(u, p, d) {
      return scanRewards.has(`${u}:${p}:${d}`);
    },
    async recordScanReward(u, p, d) {
      scanRewards.add(`${u}:${p}:${d}`);
    },
    async addXp(u, amount) {
      if (opts.failXp) throw new Error('xp write failed');
      xp.set(u, (xp.get(u) ?? 0) + amount);
    },
    async grantBadgeOnce(u, key) {
      const k = `${u}:${key}`;
      if (badges.has(k)) return false;
      badges.add(k);
      return true;
    },
    async getStreak() {
      return null;
    },
    async setScanStreak() {},
  };
  const leaderboardRepo = { async topEntries(): Promise<LeaderboardEntry[]> { return []; } };
  return { svc: new RewardsService(repo, leaderboardRepo), badges, xp };
}

describe('RewardsService', () => {
  // Feature: anvesa-marketplace, Property 33: One-time grants are idempotent
  it('Property 33: a badge is granted at most once', () => {
    fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 8 }), async (times) => {
        const { svc } = build();
        const results: boolean[] = [];
        for (let i = 0; i < times; i += 1) results.push(await svc.grantBadge('u1', 'first-scan'));
        expect(results.filter(Boolean)).toHaveLength(1);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 35: Failed XP award leaves the total unchanged
  it('Property 35: a failed XP award does not change the total', async () => {
    const { svc, xp } = build({ failXp: true });
    await expect(svc.awardScan('u1', 'p1', '2026-01-01')).rejects.toThrow();
    expect(xp.get('u1')).toBeUndefined();
  });

  it('awards scan XP once per product per day', async () => {
    const { svc, xp } = build();
    expect(await svc.awardScan('u1', 'p1', '2026-01-01')).toEqual({ awarded: true });
    expect(await svc.awardScan('u1', 'p1', '2026-01-01')).toEqual({ awarded: false });
    expect(xp.get('u1')).toBe(10);
  });
});
