/**
 * Notification dispatch rules (Requirement 26). Pure.
 */
export const NOTIF_CATEGORIES = ['order_updates', 'rewards', 'delivery_availability'] as const;
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

export const MAX_DISPATCH_ATTEMPTS = 3;

/**
 * A notification is dispatched iff the user has a registered device token and
 * has not disabled the event's category (Requirement 26.2, 26.4).
 */
export function shouldDispatch(hasRegisteredToken: boolean, categoryEnabled: boolean): boolean {
  return hasRegisteredToken && categoryEnabled;
}
