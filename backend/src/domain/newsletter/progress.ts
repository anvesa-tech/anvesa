/**
 * Reading-progress validation (Requirement 25.3, 25.4). Pure.
 * Valid iff an integer percentage in [0, 100].
 */
export function isValidProgress(pct: number): boolean {
  return Number.isInteger(pct) && pct >= 0 && pct <= 100;
}
