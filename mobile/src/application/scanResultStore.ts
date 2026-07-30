import { create } from 'zustand';
import type { ProductDetailModel } from '@/domain/productDetail';

interface ScanResultState {
  product: ProductDetailModel | null;
  setProduct: (product: ProductDetailModel) => void;
  clear: () => void;
}

/**
 * Holds the most recently scanned product so the scan-result screen can render
 * it without re-fetching. External (Open Food Facts) scans have no catalog id,
 * so they cannot be resolved via the /product/[id] route — this store bridges
 * the scanner and the result view for both catalog and external products.
 */
export const useScanResultStore = create<ScanResultState>((set) => ({
  product: null,
  setProduct: (product) => set({ product }),
  clear: () => set({ product: null }),
}));
