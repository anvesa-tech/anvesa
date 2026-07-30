/**
 * Grade-override guard (Requirement 12.5, 27.9, 28.3).
 *
 * Product create/update payloads must never carry a grade. This guard inspects
 * an arbitrary payload for forbidden grade-bearing keys and, if present,
 * rejects via GradingService (which audits and throws). Applied in the
 * presentation layer before any admin/vendor product mutation.
 */
import type { GradingService } from './GradingService';

const FORBIDDEN_KEYS = ['grade', 'productGrade', 'gradeValue', 'grade_override'];

export function payloadAttemptsGradeOverride(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') return false;
  return FORBIDDEN_KEYS.some((k) => k in (payload as Record<string, unknown>));
}

export async function guardAgainstGradeOverride(params: {
  grading: GradingService;
  actorId: string | null;
  productId: string;
  payload: unknown;
}): Promise<void> {
  if (payloadAttemptsGradeOverride(params.payload)) {
    await params.grading.rejectOverrideAttempt({
      actorId: params.actorId,
      productId: params.productId,
      attemptedValue: params.payload,
    });
  }
}
