import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

export type AppRole = 'CUSTOMER' | 'ADMIN' | 'VENDOR';

export interface VerifiedSupabaseUser {
  userId: string;
  role: AppRole;
  email: string | null;
  phone: string | null;
}

interface SupabaseClaims extends JWTPayload {
  email?: string;
  phone?: string;
  app_metadata?: { app_role?: string };
}

/**
 * Verifies a Supabase Auth (GoTrue) access token (Requirement 1, 2, 3).
 *
 * Modern Supabase projects sign access tokens with an asymmetric JWT signing
 * key (ES256/RS256) published at the project JWKS endpoint. Older projects (and
 * our own minted test tokens) use the legacy shared HS256 secret. This verifier
 * supports both: it tries JWKS verification first, then falls back to HS256.
 *
 * The `sub` claim is the Supabase `auth.users.id` — the app's canonical user id,
 * matching `auth.uid()` in the RLS policies. The app-level role
 * (CUSTOMER/ADMIN/VENDOR) is read from the `app_metadata.app_role` custom claim;
 * it defaults to CUSTOMER. (Supabase's own `role` claim is `authenticated`/`anon`.)
 */
export class SupabaseJwtVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet> | null;
  private readonly hmacKey: Uint8Array | null;

  constructor(jwtSecret: string | undefined, supabaseUrl?: string) {
    const url = supabaseUrl ?? process.env.SUPABASE_URL;
    this.jwks = url
      ? createRemoteJWKSet(new URL(`${url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`))
      : null;
    this.hmacKey = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  }

  async verify(token: string): Promise<VerifiedSupabaseUser | null> {
    const claims = await this.decode(token);
    if (!claims?.sub) return null;
    const claimed = claims.app_metadata?.app_role;
    const role: AppRole = claimed === 'ADMIN' || claimed === 'VENDOR' ? claimed : 'CUSTOMER';
    return {
      userId: claims.sub,
      role,
      email: claims.email ?? null,
      phone: claims.phone ?? null,
    };
  }

  private async decode(token: string): Promise<SupabaseClaims | null> {
    // Asymmetric (ES256/RS256) via the project JWKS — the default for new projects.
    if (this.jwks) {
      try {
        const { payload } = await jwtVerify(token, this.jwks);
        return payload as SupabaseClaims;
      } catch {
        // fall through to HS256
      }
    }
    // Legacy shared-secret HS256 (older projects / minted test tokens).
    if (this.hmacKey) {
      try {
        const { payload } = await jwtVerify(token, this.hmacKey, { algorithms: ['HS256'] });
        return payload as SupabaseClaims;
      } catch {
        return null;
      }
    }
    return null;
  }
}
