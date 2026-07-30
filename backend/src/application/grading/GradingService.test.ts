import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { GradingService, GradeOverrideError } from './GradingService';
import { guardAgainstGradeOverride } from './gradeOverrideGuard';
import { computeGrade, inputHash } from '../../domain/grading/computeGrade';
import { arbComposition } from '../../domain/grading/arbitraries';
import type { GradeRecord, ProductRepository } from '../../domain/ports/repositories';
import type { GradingInput, Grade } from '../../domain/grading/types';

const RUNS = { numRuns: 100 };

function fakeProducts(input: GradingInput | null): {
  repo: ProductRepository;
  persisted: GradeRecord[];
  stored: { grade: Grade | null };
} {
  const persisted: GradeRecord[] = [];
  const stored: { grade: Grade | null } = { grade: 'C' };
  const repo: ProductRepository = {
    async getComposition(productId) {
      return input ? { productId, input } : null;
    },
    async persistGrade(record) {
      persisted.push(record);
      stored.grade = record.grade;
    },
    async getGrade() {
      return stored.grade;
    },
  };
  return { repo, persisted, stored };
}

function fakeAudit() {
  const entries: { actorId: string | null; action: string; attempted?: unknown }[] = [];
  return {
    entries,
    repo: {
      async record(e: { actorId: string | null; action: string; attempted?: unknown }) {
        entries.push(e);
      },
    },
  };
}

describe('GradingService integrity', () => {
  // Feature: anvesa-marketplace, Property 4: Grade is recomputed and persisted consistently on composition change
  it('Property 4: persisted grade equals computeGrade of the composition', () => {
    fc.assert(
      fc.asyncProperty(arbComposition, async (input) => {
        const { repo, persisted } = fakeProducts(input);
        const { repo: audit } = fakeAudit();
        const svc = new GradingService(repo, audit);
        const grade = await svc.recomputeFor('p1');
        const expected = computeGrade(input);
        expect(grade).toBe(expected.grade);
        expect(persisted).toHaveLength(1);
        expect(persisted[0]?.grade).toBe(expected.grade);
        expect(persisted[0]?.inputHash).toBe(inputHash(input));
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 3: Grade override attempts are rejected, leave the grade unchanged, and are audited
  it('Property 3: override attempts are rejected, grade unchanged, audited', () => {
    fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant('A'), fc.constant('B'), fc.constant('C'), fc.constant('D')),
        fc.string(),
        async (attemptedGrade, actorId) => {
          const { repo, stored } = fakeProducts(null);
          const before = stored.grade;
          const { repo: audit, entries } = fakeAudit();
          const svc = new GradingService(repo, audit);

          await expect(
            guardAgainstGradeOverride({
              grading: svc,
              actorId,
              productId: 'p1',
              payload: { name: 'X', grade: attemptedGrade },
            }),
          ).rejects.toBeInstanceOf(GradeOverrideError);

          // grade unchanged
          expect(stored.grade).toBe(before);
          // audited with actor, attempted value, and (implicit) timestamp at persistence
          expect(entries).toHaveLength(1);
          expect(entries[0]?.actorId).toBe(actorId);
          expect(entries[0]?.action).toBe('GRADE_OVERRIDE_ATTEMPT');
          expect(JSON.stringify(entries[0]?.attempted)).toContain(String(attemptedGrade));
        },
      ),
      RUNS,
    );
  });

  it('allows payloads that do not carry a grade', async () => {
    const { repo } = fakeProducts(null);
    const { repo: audit, entries } = fakeAudit();
    const svc = new GradingService(repo, audit);
    await guardAgainstGradeOverride({
      grading: svc,
      actorId: 'admin1',
      productId: 'p1',
      payload: { name: 'Clean Oats', priceCents: 20000 },
    });
    expect(entries).toHaveLength(0);
  });
});
