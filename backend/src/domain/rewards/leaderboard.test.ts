import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { rankLeaderboard, LEADERBOARD_SIZE, type LeaderboardEntry } from './leaderboard';

const RUNS = { numRuns: 100 };

const arbEntry: fc.Arbitrary<LeaderboardEntry> = fc.record({
  userId: fc.uuid(),
  xp: fc.integer({ min: 0, max: 100000 }),
  reachedAtMs: fc.integer({ min: 0, max: 1e12 }),
});

describe('leaderboard ranking', () => {
  // Feature: anvesa-marketplace, Property 34: Leaderboard ordering and bound
  it('Property 34: at most 100 entries, XP-desc, ties by earliest reached', () => {
    fc.assert(
      fc.property(fc.array(arbEntry, { maxLength: 250 }), (entries) => {
        const ranked = rankLeaderboard(entries);
        expect(ranked.length).toBeLessThanOrEqual(LEADERBOARD_SIZE);
        expect(ranked.length).toBe(Math.min(entries.length, LEADERBOARD_SIZE));
        for (let i = 1; i < ranked.length; i += 1) {
          const prev = ranked[i - 1]!;
          const cur = ranked[i]!;
          const ordered =
            prev.xp > cur.xp || (prev.xp === cur.xp && prev.reachedAtMs <= cur.reachedAtMs);
          expect(ordered).toBe(true);
        }
      }),
      RUNS,
    );
  });
});
