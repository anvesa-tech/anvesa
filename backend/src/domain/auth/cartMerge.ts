/**
 * Guest→account cart merge (Requirement 2.4, 2.5). Pure.
 * For every variant present in both carts, the higher quantity is retained.
 */
export interface MergeLine {
  variantId: string;
  qty: number;
}

export function mergeGuestCart(
  accountCart: readonly MergeLine[],
  guestCart: readonly MergeLine[],
): MergeLine[] {
  const merged = new Map<string, number>();
  for (const l of accountCart) merged.set(l.variantId, l.qty);
  for (const l of guestCart) {
    const existing = merged.get(l.variantId);
    merged.set(l.variantId, existing === undefined ? l.qty : Math.max(existing, l.qty));
  }
  return [...merged.entries()].map(([variantId, qty]) => ({ variantId, qty }));
}
