import { useQuery } from '@tanstack/react-query';
import { fetchProductDetail } from '@/infrastructure/api/productApi';
import { getMockDetail } from './mockProductDetail';
import type { ProductDetailModel } from '@/domain/productDetail';

/**
 * Product detail query. Serves live backend detail; if the backend is
 * unreachable it falls back to the bundled mock detail (which only knows mock
 * ids, so live ids simply show the not-found state offline).
 */
export function useProductDetail(id: string | undefined) {
  return useQuery<ProductDetailModel | null>({
    queryKey: ['product', id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) return null;
      try {
        const live = await fetchProductDetail(id);
        if (live) return live;
      } catch {
        // fall through to mock
      }
      return getMockDetail(id);
    },
    staleTime: 60_000,
    retry: 1,
  });
}
