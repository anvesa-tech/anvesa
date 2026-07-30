/**
 * Subscription scheduling rules (Requirement 21). Pure.
 */
export type SubStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export const RECURRENCE_DAYS = 2;

/** A due order is generated only for ACTIVE subs whose next date has arrived. */
export function shouldGenerate(status: SubStatus, nextDeliveryAtMs: number, nowMs: number): boolean {
  return status === 'ACTIVE' && nextDeliveryAtMs <= nowMs;
}

/** Advance the schedule by the 2-day recurrence. */
export function advanceSchedule(nextDeliveryAtMs: number): number {
  return nextDeliveryAtMs + RECURRENCE_DAYS * 86_400_000;
}
