import { getContainer } from '../di/container';

/**
 * Scheduled workers (Requirement 21.2, 19.3).
 * - Subscription due-order generator: creates recurring orders for ACTIVE
 *   subscriptions whose 2-day schedule has arrived, advancing the schedule.
 * - Slot-hold expiry is handled by Redis TTL on the reservation keys, so no
 *   explicit sweeper is required; this worker logs a periodic heartbeat.
 *
 * Run with: `tsx src/infrastructure/workers/scheduler.ts`
 */
const SUBSCRIPTION_INTERVAL_MS = 60 * 60 * 1000; // hourly

export async function runSubscriptionCycle(nowMs: number = Date.now()): Promise<number> {
  const generated = await getContainer().subscription.generateDueOrders(nowMs);
  if (generated > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[scheduler] generated ${generated} recurring subscription order(s)`);
  }
  return generated;
}

export function startScheduler(): NodeJS.Timeout {
  // eslint-disable-next-line no-console
  console.warn('[scheduler] started — subscription cycle runs hourly');
  return setInterval(() => {
    void runSubscriptionCycle();
  }, SUBSCRIPTION_INTERVAL_MS);
}

// Allow direct execution.
if (process.argv[1]?.endsWith('scheduler.ts')) {
  void runSubscriptionCycle().then((n) => {
    // eslint-disable-next-line no-console
    console.warn(`[scheduler] one-shot cycle complete (${n} orders)`);
    process.exit(0);
  });
}
