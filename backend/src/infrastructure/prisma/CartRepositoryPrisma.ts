import type { PrismaClient } from '@prisma/client';
import type { CartRepository, CartView } from '../../domain/ports/repositories';

/** Prisma-backed cart (Requirement 6, 13, 22). */
export class CartRepositoryPrisma implements CartRepository {
  constructor(private readonly db: PrismaClient) {}

  private async ensureCart(ownerId: string, isGuest: boolean): Promise<string> {
    const cart = await this.db.cart.upsert({
      where: { ownerId },
      update: {},
      create: { ownerId, isGuest },
    });
    return cart.id;
  }

  async getCart(ownerId: string): Promise<CartView> {
    const cart = await this.db.cart.findUnique({
      where: { ownerId },
      include: {
        items: {
          include: { variant: { include: { product: true } } },
        },
      },
    });
    if (!cart) return { ownerId, lines: [], subtotalCents: 0 };

    const lines = cart.items.map((it) => ({
      itemId: it.id,
      variantId: it.variantId,
      productName: it.variant.product.name,
      priceCents: it.variant.priceCents,
      qty: it.qty,
      stock: it.variant.stock,
    }));
    const subtotalCents = lines.reduce((s, l) => s + l.priceCents * l.qty, 0);
    return { ownerId, lines, subtotalCents };
  }

  async getVariantStock(variantId: string): Promise<number | null> {
    const v = await this.db.productVariant.findUnique({ where: { id: variantId } });
    return v ? v.stock : null;
  }

  async upsertItem(ownerId: string, variantId: string, qty: number, isGuest: boolean): Promise<void> {
    const cartId = await this.ensureCart(ownerId, isGuest);
    await this.db.cartItem.upsert({
      where: { cartId_variantId: { cartId, variantId } },
      update: { qty },
      create: { cartId, variantId, qty },
    });
  }

  async incrementItem(
    ownerId: string,
    variantId: string,
    delta: number,
    isGuest: boolean,
  ): Promise<void> {
    const cartId = await this.ensureCart(ownerId, isGuest);
    const existing = await this.db.cartItem.findUnique({
      where: { cartId_variantId: { cartId, variantId } },
    });
    if (existing) {
      await this.db.cartItem.update({
        where: { id: existing.id },
        data: { qty: existing.qty + delta },
      });
    } else {
      await this.db.cartItem.create({ data: { cartId, variantId, qty: Math.max(1, delta) } });
    }
  }

  async removeItem(ownerId: string, itemId: string): Promise<void> {
    const cart = await this.db.cart.findUnique({ where: { ownerId } });
    if (!cart) return;
    await this.db.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  }

  async clear(ownerId: string): Promise<void> {
    const cart = await this.db.cart.findUnique({ where: { ownerId } });
    if (!cart) return;
    await this.db.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async bundleInStockVariants(bundleId: string): Promise<string[]> {
    const items = await this.db.bundleProduct.findMany({ where: { bundleId } });
    const variantIds: string[] = [];
    for (const item of items) {
      const variant = await this.db.productVariant.findFirst({
        where: { productId: item.productId, stock: { gt: 0 } },
        orderBy: { priceCents: 'asc' },
      });
      if (variant) variantIds.push(variant.id);
    }
    return variantIds;
  }
}
