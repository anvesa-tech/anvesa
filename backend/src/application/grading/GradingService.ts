/**
 * GradingService — the ONLY writer of product grade rows (Requirement 12.7,
 * 27.8, 28.2). It reads composition through the ProductRepository, runs the
 * pure Grading_Engine, and persists the computed grade + reasoning.
 *
 * There is no method that accepts a grade value. Grade-override attempts are
 * handled by `rejectOverrideAttempt`, which never mutates the grade and always
 * writes an audit entry (Requirement 12.5, 27.9, 28.3, 30.8).
 */
import { computeGrade, inputHash } from '../../domain/grading/computeGrade';
import type { Grade } from '../../domain/grading/types';
import type { AuditRepository, ProductRepository } from '../../domain/ports/repositories';

export class GradeOverrideError extends Error {
  readonly code = 'GRADE_OVERRIDE_DENIED';
  constructor() {
    super('Grades are computed objectively and cannot be overridden.');
  }
}

export class GradingService {
  constructor(
    private readonly products: ProductRepository,
    private readonly audit: AuditRepository,
  ) {}

  /** Recompute and persist a product's grade from its current composition. */
  async recomputeFor(productId: string): Promise<Grade | null> {
    const record = await this.products.getComposition(productId);
    if (!record) return null;

    const result = computeGrade(record.input);
    await this.products.persistGrade({
      productId,
      grade: result.grade,
      inputHash: inputHash(record.input),
      reasoning: result.reasoning.map((r) => ({
        factor: r.factor,
        weight: r.weight,
        detail: r.detail,
      })),
      redFlags: result.redFlags.map((f) => ({
        type: f.type,
        severity: f.severity,
        note: f.note,
      })),
    });
    return result.grade;
  }

  /**
   * Reject any attempt to set/override a grade. Leaves the stored grade
   * unchanged and records the attempt in the audit log with requester
   * identity, attempted value, and timestamp.
   */
  async rejectOverrideAttempt(params: {
    actorId: string | null;
    productId: string;
    attemptedValue: unknown;
  }): Promise<never> {
    await this.audit.record({
      actorId: params.actorId,
      action: 'GRADE_OVERRIDE_ATTEMPT',
      attempted: { productId: params.productId, attemptedValue: params.attemptedValue },
    });
    throw new GradeOverrideError();
  }
}
