import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchSearch } from '@/infrastructure/api/searchApi';
import type { ProductCardModel } from '@/domain/product';

/**
 * Search query. Active only when a text query or at least one filter is set;
 * otherwise the marketplace shows the grouped home view.
 */
export function useSearch(q: string, filters: string[]) {
  const active = q.trim().length > 0 || filters.length > 0;
  const query = useQuery<ProductCardModel[]>({
    queryKey: ['search', q.trim(), [...filters].sort()],
    queryFn: () => fetchSearch(q.trim(), filters),
    enabled: active,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  return { active, results: query.data ?? [], isLoading: query.isLoading };
}
