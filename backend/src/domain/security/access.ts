/**
 * Security primitives (Requirement 30). Pure, deterministic decisions used by
 * the Security_Layer middleware.
 */

export interface AccessTokenState {
  present: boolean;
  wellFormed: boolean;
  expired: boolean;
  revoked: boolean;
}

/** Access granted iff the token is present, well-formed, unexpired, not revoked. */
export function isAccessGranted(t: AccessTokenState): boolean {
  return t.present && t.wellFormed && !t.expired && !t.revoked;
}

/** Rate limit: allowed iff the hit count within the window is at most the limit. */
export function withinRateLimit(hitsInWindow: number, limit: number): boolean {
  return hitsInWindow <= limit;
}

export const API_RATE_LIMIT = 100; // per 60s window
export const OTP_RATE_LIMIT = 5; // per 15-min window

/** Upload allowed iff within the size cap and of an allowed content type. */
export function isUploadAllowed(
  sizeBytes: number,
  maxBytes: number,
  contentType: string,
  allowedTypes: readonly string[],
): boolean {
  return sizeBytes > 0 && sizeBytes <= maxBytes && allowedTypes.includes(contentType);
}
