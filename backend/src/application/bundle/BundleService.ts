import { bundleAvailability, type BundleAvailability } from '../../domain/catalog/bundle';

export interface BundleView {
  id: string;
  key: string;
  name: string;
  priceCents: number;
  products: { productId: string; name: string; inStock: boolean }[];
}

export interface BundleRepository {
  listBundles(): Promise<BundleView[]>;
}

export interface BundleWithAvailability extends BundleView {
  availability: BundleAvailability;
}

/**
 * Bundle_Service (Requirement 22). Returns the fixed functional bundles with
 * computed per-product availability and partial-availability flags.
 */
export class BundleService {
  constructor(private readonly repo: BundleRepository) {}

  async listBundles(): Promise<BundleWithAvailability[]> {
    const bundles = await this.repo.listBundles();
    return bundles.map((b) => ({
      ...b,
      availability: bundleAvailability(
        b.products.map((p) => ({ productId: p.productId, inStock: p.inStock })),
      ),
    }));
  }
}
