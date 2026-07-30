import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  distanceMeters,
  isServiceable,
  isValidPincode,
  SERVICE_CENTRE,
  SERVICE_RADIUS_METERS,
} from './geo';

const RUNS = { numRuns: 100 };

describe('delivery geofence & pincode', () => {
  // Feature: anvesa-marketplace, Property 39: Geofence serviceability boundary
  it('Property 39: serviceable iff within 5km of the centre', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 28.3, max: 28.7, noNaN: true }),
        fc.double({ min: 76.9, max: 77.3, noNaN: true }),
        (lat, lng) => {
          const within = distanceMeters(SERVICE_CENTRE, { lat, lng }) <= SERVICE_RADIUS_METERS;
          expect(isServiceable({ lat, lng })).toBe(within);
        },
      ),
      RUNS,
    );
  });

  it('the service centre itself is serviceable', () => {
    expect(isServiceable(SERVICE_CENTRE)).toBe(true);
  });

  // Feature: anvesa-marketplace, Property 40: Pincode format validation
  it('Property 40: accepted iff exactly 6 digits', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        expect(isValidPincode(s)).toBe(/^\d{6}$/.test(s));
      }),
      RUNS,
    );
  });
});
