import { validateQty } from '../../domain/commerce/cart';
import type { CartRepository, CartView } from '../../domain/ports/repositories';

export type CartError = 'OUT_OF_STOCK' | 'BELOW_MIN' | 'VARIANT_NOT_FOUND';

export type CartResult = { ok: true; cart: CartView } | { ok: false; error: CartError };

/**
 * Cart_Service (Requirement 6, 13, 22). Applies stock-checked quantity rules
 * from the pure domain and persists through the CartRepository. `isGuest`
 * marks guest carts so they persist for the guest-session window (R13.6).
 */
export class CartService {
  constructor(private readonly repo: CartRepository) {}

  getCart(ownerId: string): Promise<CartView> {
    return this.repo.getCart(ownerId);
  }

  async quickAdd(ownerId: string, variantId: string, isGuest = false): Promise<CartResult> {
    const stock = await this.repo.getVariantStock(variantId);
    if (stock === null) return { ok: false, error: 'VARIANT_NOT_FOUND' };
    if (stock < 1) return { ok: false, error: 'OUT_OF_STOCK' };
    await this.repo.incrementItem(ownerId, variantId, 1, isGuest);
    return { ok: true, cart: await this.repo.getCart(ownerId) };
  }

  async setQty(
    ownerId: string,
    variantId: string,
    qty: number,
    isGuest = false,
  ): Promise<CartResult> {
    const stock = await this.repo.getVariantStock(variantId);
    if (stock === null) return { ok: false, error: 'VARIANT_NOT_FOUND' };
    const check = validateQty(qty, stock);
    if (!check.ok) {
      return { ok: false, error: check.reason === 'below_min' ? 'BELOW_MIN' : 'OUT_OF_STOCK' };
    }
    await this.repo.upsertItem(ownerId, variantId, qty, isGuest);
    return { ok: true, cart: await this.repo.getCart(ownerId) };
  }

  async removeItem(ownerId: string, itemId: string): Promise<CartView> {
    await this.repo.removeItem(ownerId, itemId);
    return this.repo.getCart(ownerId);
  }

  async clear(ownerId: string): Promise<CartView> {
    await this.repo.clear(ownerId);
    return this.repo.getCart(ownerId);
  }

  /** Add only the in-stock products of a bundle (Requirement 22.5). */
  async addBundle(ownerId: string, bundleId: string, isGuest = false): Promise<CartView> {
    const variantIds = await this.repo.bundleInStockVariants(bundleId);
    for (const variantId of variantIds) {
      await this.repo.incrementItem(ownerId, variantId, 1, isGuest);
    }
    return this.repo.getCart(ownerId);
  }
}
