import type { GradingService } from '../grading/GradingService';
import { payloadAttemptsGradeOverride } from '../grading/gradeOverrideGuard';

export interface VendorProductInput {
  vendorId: string;
  name: string;
  categoryId: string;
  brandId: string;
  nutrition: unknown;
  ingredients: unknown[];
}

export interface VendorRepository {
  createVendor(name: string): Promise<{ id: string }>;
  setActive(vendorId: string, active: boolean): Promise<void>;
  createProduct(input: VendorProductInput): Promise<{ id: string }>;
}

export type VendorSubmitResult =
  | { ok: true; productId: string; grade: string | null }
  | { ok: false; error: 'GRADE_OVERRIDE_DENIED' };

/**
 * Vendor_Service (Requirement 28). Vendors submit product composition data
 * associated with the vendor; the grade is computed by the Grading_Engine.
 * Any attempt to set a grade directly is rejected and audited. Deactivating a
 * vendor excludes its products from marketplace/search/detail (enforced by the
 * read repositories' active-vendor filter).
 */
export class VendorService {
  constructor(
    private readonly repo: VendorRepository,
    private readonly grading: GradingService,
  ) {}

  createVendor(name: string): Promise<{ id: string }> {
    return this.repo.createVendor(name);
  }

  deactivate(vendorId: string): Promise<void> {
    return this.repo.setActive(vendorId, false);
  }

  async submitProduct(
    actorId: string,
    input: VendorProductInput & Record<string, unknown>,
  ): Promise<VendorSubmitResult> {
    if (payloadAttemptsGradeOverride(input)) {
      await this.grading
        .rejectOverrideAttempt({ actorId, productId: 'new', attemptedValue: input })
        .catch(() => undefined);
      return { ok: false, error: 'GRADE_OVERRIDE_DENIED' };
    }
    const product = await this.repo.createProduct(input);
    const grade = await this.grading.recomputeFor(product.id);
    return { ok: true, productId: product.id, grade };
  }
}
