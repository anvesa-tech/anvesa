import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { applyWallet, creditCashback } from './wallet';

const RUNS = { numRuns: 100 };

describe('wallet math', () => {
  // Feature: anvesa-marketplace, Property 11: Wallet application deducts exactly and records a debit
  it('Property 11: valid application deducts exactly min(amount, outstanding)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1_000_000 }), // balance
        fc.integer({ min: 1, max: 1_000_000 }), // amount
        fc.integer({ min: 0, max: 1_000_000 }), // outstanding
        (balance, amount, outstanding) => {
          const res = applyWallet(balance, amount, outstanding);
          if (amount <= balance) {
            expect(res.ok).toBe(true);
            if (res.ok) {
              const expectedApplied = Math.min(amount, outstanding);
              expect(res.appliedCents).toBe(expectedApplied);
              expect(res.newBalanceCents).toBe(balance - expectedApplied);
            }
          } else {
            expect(res).toEqual({ ok: false, reason: 'insufficient_balance' });
          }
        },
      ),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 12: Invalid wallet amounts are rejected without changing the balance
  it('Property 12: zero/negative or over-balance amounts are rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: -1000, max: 2_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (balance, amount, outstanding) => {
          const res = applyWallet(balance, amount, outstanding);
          if (amount <= 0) {
            expect(res).toEqual({ ok: false, reason: 'invalid_amount' });
          } else if (amount > balance) {
            expect(res).toEqual({ ok: false, reason: 'insufficient_balance' });
          } else {
            expect(res.ok).toBe(true);
          }
        },
      ),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 13: Cashback credit increases balance exactly and records a credit
  it('Property 13: cashback increases balance by exactly the amount', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (balance, amount) => {
          expect(creditCashback(balance, amount)).toBe(balance + amount);
        },
      ),
      RUNS,
    );
  });
});
