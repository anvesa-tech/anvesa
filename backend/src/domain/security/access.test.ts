import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { isAccessGranted, withinRateLimit, isUploadAllowed } from './access';

const RUNS = { numRuns: 100 };

describe('security primitives', () => {
  // Feature: anvesa-marketplace, Property 49: Access-token gating
  it('Property 49: granted iff present, well-formed, unexpired, not revoked', () => {
    fc.assert(
      fc.property(fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean(), (present, wellFormed, expired, revoked) => {
        const granted = isAccessGranted({ present, wellFormed, expired, revoked });
        expect(granted).toBe(present && wellFormed && !expired && !revoked);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 47: Request rate limiting by window
  it('Property 47: allowed iff hits within window <= limit', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), fc.integer({ min: 1, max: 200 }), (hits, limit) => {
        expect(withinRateLimit(hits, limit)).toBe(hits <= limit);
      }),
      RUNS,
    );
  });

  // Feature: anvesa-marketplace, Property 52: Upload validation by size and type
  it('Property 52: rejected when over max size or disallowed type', () => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    fc.assert(
      fc.property(
        fc.integer({ min: -10, max: 20_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/html'),
        (size, max, type) => {
          const ok = isUploadAllowed(size, max, type, allowed);
          expect(ok).toBe(size > 0 && size <= max && allowed.includes(type));
        },
      ),
      RUNS,
    );
  });
});
