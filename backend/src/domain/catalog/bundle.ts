/**
 * Bundle availability logic (Requirement 22). Pure.
 */
export interface BundleItem {
  productId: string;
  inStock: boolean;
}

export interface BundleAvailability {
  inStockProductIds: string[];
  unavailableProductIds: string[];
  partiallyAvailable: boolean;
  fullyAvailable: boolean;
}

/** Split bundle products into in-stock and unavailable, flagging partial. */
export function bundleAvailability(items: readonly BundleItem[]): BundleAvailability {
  const inStockProductIds = items.filter((i) => i.inStock).map((i) => i.productId);
  const unavailableProductIds = items.filter((i) => !i.inStock).map((i) => i.productId);
  return {
    inStockProductIds,
    unavailableProductIds,
    partiallyAvailable: unavailableProductIds.length > 0 && inStockProductIds.length > 0,
    fullyAvailable: unavailableProductIds.length === 0,
  };
}
