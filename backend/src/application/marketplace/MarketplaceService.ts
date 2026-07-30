import { GROUP_KEYS, type GroupKey, type ProductGroupDTO } from '../../domain/catalog/types';
import type { CachePort } from '../../domain/ports/gateways';
import type { MarketplaceRepository } from '../../domain/ports/repositories';

const TITLES: Record<GroupKey, string> = {
  breakfast: 'Breakfast',
  snacks: 'Snacks',
  beverages: 'Beverages',
  staples: 'Staples',
  kids: 'Kids',
  protein: 'Protein',
  organic: 'Organic',
  dairy: 'Dairy',
  'healthy-alternatives': 'Healthy Alternatives',
};

export const HOME_PAGE_SIZE = 20;
const CACHE_TTL_SEC = 60;

/**
 * Marketplace_Service (Requirement 5). Serves the nine home groups with
 * cache-aside Redis caching and cursor pagination. Grades come from the
 * Grading_Engine via persisted ProductGrade rows — never recomputed here.
 */
export class MarketplaceService {
  constructor(
    private readonly repo: MarketplaceRepository,
    private readonly cache: CachePort,
  ) {}

  async getHomeGroups(): Promise<ProductGroupDTO[]> {
    const cacheKey = 'marketplace:home';
    const cached = await this.cache.get<ProductGroupDTO[]>(cacheKey);
    if (cached) return cached;

    const groups: ProductGroupDTO[] = [];
    for (const key of GROUP_KEYS) {
      const products = await this.repo.listByGroup(key, HOME_PAGE_SIZE);
      groups.push({ key, title: TITLES[key], products });
    }
    await this.cache.set(cacheKey, groups, CACHE_TTL_SEC);
    return groups;
  }

  async getGroupPage(
    group: GroupKey,
    cursor?: string,
  ): Promise<{ products: ProductGroupDTO['products']; nextCursor: string | null }> {
    const products = await this.repo.listByGroup(group, HOME_PAGE_SIZE, cursor);
    const nextCursor =
      products.length === HOME_PAGE_SIZE ? (products[products.length - 1]?.id ?? null) : null;
    return { products, nextCursor };
  }
}
