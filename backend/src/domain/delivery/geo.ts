/**
 * Delivery geofence and pincode validation (Requirement 18). Pure functions.
 */

/** Serviceable centre: CDS Corporate, Cyber Park, Gurugram. */
export const SERVICE_CENTRE = { lat: 28.4949, lng: 77.0895 } as const;
export const SERVICE_RADIUS_METERS = 5000;

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance in metres between two coordinates (Haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Serviceable iff within 5km of the service centre (Requirement 18.1, 18.2). */
export function isServiceable(point: { lat: number; lng: number }): boolean {
  return distanceMeters(SERVICE_CENTRE, point) <= SERVICE_RADIUS_METERS;
}

/** Valid iff exactly 6 digits (Requirement 18.3). */
export function isValidPincode(pincode: string): boolean {
  return /^\d{6}$/.test(pincode);
}
