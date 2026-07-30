/**
 * Admin pagination clamp (Requirement 27.3). Pure.
 * Effective page size = requested clamped to [1, 50], default 20 when unset.
 */
export const ADMIN_DEFAULT_PAGE_SIZE = 20;
export const ADMIN_MAX_PAGE_SIZE = 50;

export function clampPageSize(requested?: number): number {
  if (requested === undefined || Number.isNaN(requested)) return ADMIN_DEFAULT_PAGE_SIZE;
  const floored = Math.floor(requested);
  return Math.min(ADMIN_MAX_PAGE_SIZE, Math.max(1, floored));
}
