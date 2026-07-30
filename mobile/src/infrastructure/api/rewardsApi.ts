import { TRPC_URL } from './config';

export interface LeaderboardRow {
  userId: string;
  xp: number;
  reachedAtMs: number;
}

/** Fetch the public Satya XP leaderboard from the backend. */
export async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await fetch(`${TRPC_URL}/rewards.leaderboard`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Leaderboard failed: ${res.status}`);
  const body = (await res.json()) as { result?: { data?: { json?: LeaderboardRow[] } } };
  return body.result?.data?.json ?? [];
}
