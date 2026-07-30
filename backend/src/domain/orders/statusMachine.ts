/**
 * Order status state machine (Requirement 27.5). Pure — encodes the allowed
 * status transitions and nothing else.
 */
export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;

const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

/** True iff `to` is an allowed next status from `from`. */
export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
