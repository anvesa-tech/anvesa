/**
 * Leaderboard ranking (Requirement 23.6). Pure.
 * Top 100 by descending XP, ties broken by earliest time the total was reached.
 */
export interface LeaderboardEntry {
  userId: string;
  xp: number;
  reachedAtMs: number;
}

export const LEADERBOARD_SIZE = 100;

export function rankLeaderboard(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => (b.xp !== a.xp ? b.xp - a.xp : a.reachedAtMs - b.reachedAtMs))
    .slice(0, LEADERBOARD_SIZE);
}
