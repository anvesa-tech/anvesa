/**
 * Streak logic and scan-reward dedupe helpers (Requirement 23, 24). Pure.
 *
 * Days are UTC calendar days formatted as 'YYYY-MM-DD'. The streak counts the
 * run of consecutive UTC days ending on the most recent activity day.
 */

/** Days between two UTC 'YYYY-MM-DD' strings (b - a). Returns null if invalid. */
export function dayDiff(a: string, b: string): number | null {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / 86_400_000);
}

/**
 * Next streak value given the last activity day, today, and the current streak.
 * - same day as last → unchanged (idempotent within a day)
 * - exactly the next day → +1
 * - any larger gap, or no prior activity → reset to 1 (today starts a streak)
 */
export function nextStreak(lastDay: string | null, today: string, current: number): number {
  if (lastDay === null) return 1;
  const diff = dayDiff(lastDay, today);
  if (diff === null) return 1;
  if (diff <= 0) return current; // same day (or clock skew) — no change
  if (diff === 1) return current + 1;
  return 1; // gap → streak restarts today
}

/**
 * Whether a scan reward should be granted, given whether one was already
 * recorded for this (user, product, utcDay). Dedup is per product per UTC day.
 */
export function shouldAwardScan(alreadyRewardedToday: boolean): boolean {
  return !alreadyRewardedToday;
}
