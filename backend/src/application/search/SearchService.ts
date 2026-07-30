import type { ProductCardDTO } from '../../domain/catalog/types';
import { matchesFilter, matchesQuery, type HealthFilter } from '../../domain/catalog/filters';
import type { SearchRepository } from '../../domain/ports/repositories';

const MAX_CANDIDATES = 500;

/**
 * Search_Service (Requirement 9). Case-insensitive text match over
 * name/brand/category combined by conjunction with health filters. Empty or
 * whitespace queries skip text matching.
 */
export class SearchService {
  constructor(private readonly repo: SearchRepository) {}

  async search(query: string, filters: HealthFilter[]): Promise<ProductCardDTO[]> {
    const rows = await this.repo.listSearchable(MAX_CANDIDATES);
    return rows
      .filter(
        (r) => matchesQuery(r.filterable, query) && filters.every((f) => matchesFilter(r.filterable, f)),
      )
      .map((r) => r.card);
  }
}
