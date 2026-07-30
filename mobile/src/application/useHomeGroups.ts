import { useQuery } from '@tanstack/react-query';
import { fetchHomeGroups } from '@/infrastructure/api/marketplaceApi';
import { MOCK_GROUPS } from './mockCatalog';
import type { ProductGroup } from '@/domain/product';

/**
 * Home groups query. Serves live graded data from the backend, falling back to
 * the bundled mock catalog if the backend is unreachable (offline resilience,
 * Requirement 29.3).
 */
export function useHomeGroups() {
  const query = useQuery<ProductGroup[]>({
    queryKey: ['marketplace', 'homeGroups'],
    queryFn: fetchHomeGroups,
    staleTime: 60_000,
    retry: 1,
  });

  const groups = query.data && query.data.length > 0 ? query.data : MOCK_GROUPS;
  const isLive = !!query.data && query.data.length > 0 && !query.isError;

  return { groups, isLive, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}
