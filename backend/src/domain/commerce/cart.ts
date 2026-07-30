/**
 * Pure cart math (Requirement 13, 6.6). No I/O.
 */

export interface CartLine {
  variantId: string;
  priceCents: number;
  qty: number;
}

/** Cart total = Σ price × qty over all lines (Requirement 13.1-13.3). */
export function cartTotal(lines: readonly CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}

export type QtyValidation =
  | { ok: true; qty: number }
  | { ok: false; reason: 'below_min' | 'out_of_stock' };

/**
 * Validate a requested quantity against available stock.
 * Rejects qty < 1 (below_min) and qty > stock (out_of_stock) without mutation
 * (Requirement 6.6, 13.4, 13.5).
 */
export function validateQty(qty: number, stock: number): QtyValidation {
  if (!Number.isInteger(qty) || qty < 1) return { ok: false, reason: 'below_min' };
  if (qty > stock) return { ok: false, reason: 'out_of_stock' };
  return { ok: true, qty };
}
