import { applyWallet } from '../../domain/commerce/wallet';
import type { WalletRepository } from '../../domain/ports/repositories';

export type WalletApplyResult =
  | { ok: true; appliedCents: number; newBalanceCents: number }
  | { ok: false; error: 'INVALID_AMOUNT' | 'INSUFFICIENT_BALANCE' };

/**
 * Wallet_Service (Requirement 15, 24.6). Applies wallet balance toward an order
 * using the pure domain rule, and records transactions. Cashback credits are
 * idempotent via an idempotency key.
 */
export class WalletService {
  constructor(private readonly wallet: WalletRepository) {}

  async applyToOrder(
    userId: string,
    amountCents: number,
    outstandingCents: number,
  ): Promise<WalletApplyResult> {
    const balance = await this.wallet.getBalance(userId);
    const result = applyWallet(balance, amountCents, outstandingCents);
    if (!result.ok) {
      return {
        ok: false,
        error: result.reason === 'invalid_amount' ? 'INVALID_AMOUNT' : 'INSUFFICIENT_BALANCE',
      };
    }
    await this.wallet.applyDebit(userId, result.appliedCents, 'order_payment');
    return { ok: true, appliedCents: result.appliedCents, newBalanceCents: result.newBalanceCents };
  }

  /** Idempotent cashback credit keyed by idempotencyKey (Requirement 24.6). */
  async grantCashback(userId: string, amountCents: number, idempotencyKey: string): Promise<void> {
    if (amountCents <= 0) return;
    await this.wallet.applyCredit(userId, amountCents, 'cashback', idempotencyKey);
  }
}
