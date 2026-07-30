import type { ProductCardDTO } from '../../domain/catalog/types';

export interface WishlistRepository {
  add(userId: string, productId: string): Promise<void>;
  remove(userId: string, productId: string): Promise<void>;
  list(userId: string): Promise<ProductCardDTO[]>;
  recordView(userId: string, productId: string): Promise<void>;
  recentlyViewed(userId: string, limit: number): Promise<ProductCardDTO[]>;
}

export const RECENTLY_VIEWED_MAX = 20;

/**
 * Wishlist_Service (Requirement 6, 7). Saved products (most-recent-first,
 * deduped by the repository's unique constraint) and recently-viewed history.
 */
export class WishlistService {
  constructor(private readonly repo: WishlistRepository) {}

  add(userId: string, productId: string): Promise<void> {
    return this.repo.add(userId, productId);
  }
  remove(userId: string, productId: string): Promise<void> {
    return this.repo.remove(userId, productId);
  }
  list(userId: string): Promise<ProductCardDTO[]> {
    return this.repo.list(userId);
  }
  recordView(userId: string, productId: string): Promise<void> {
    return this.repo.recordView(userId, productId);
  }
  recentlyViewed(userId: string): Promise<ProductCardDTO[]> {
    return this.repo.recentlyViewed(userId, RECENTLY_VIEWED_MAX);
  }
}
