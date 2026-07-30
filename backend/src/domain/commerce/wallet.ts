/**
 * Pure wallet application and cashback math (Requirement 15). No I/O.
 */

export type WalletApplication =
  | { ok: true; appliedCents: number; newBalanceCents: number }
  | { ok: false; reason: 'invalid_amount' | 'insufficient_balance' };

/**
 * Apply a wallet amount toward an order's outstanding total.
 * Accepted iff 0 < amount ≤ min(balance, outstanding) (Requirement 15.2-15.4).
 * On rejection the balance is conceptually unchanged (caller must not persist).
 */
export function applyWallet(
  balanceCents: number,
  amountCents: number,
  outstandingCents: number,
): WalletApplication {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  if (amountCents > balanceCents) {
    return { ok: false, reason: 'insufficient_balance' };
  }
  const applied = Math.min(amountCents, outstandingCents);
  return { ok: true, appliedCents: applied, newBalanceCents: balanceCents - applied };
}

/** Credit cashback to a balance (Requirement 15.5). */
export function creditCashback(balanceCents: number, amountCents: number): number {
  return balanceCents + Math.max(0, amountCents);
}
