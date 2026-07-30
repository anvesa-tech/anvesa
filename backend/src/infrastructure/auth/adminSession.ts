import { cookies } from 'next/headers';
import { prisma } from '../prisma/client';
import { SupabaseJwtVerifier } from './SupabaseJwtVerifier';

/**
 * Admin panel session (Requirement 27.7). The `/admin` surface is protected by
 * an HTTP-only cookie holding a Supabase access token. A request is treated as
 * admin only if BOTH hold: the token is a valid Supabase JWT, AND the mirrored
 * user in our own database has role ADMIN. Granting admin is therefore a
 * deliberate DB change (see prisma/makeAdmin.ts), not a self-serve claim.
 */
export const ADMIN_COOKIE = 'anvesa_admin';

const verifier = new SupabaseJwtVerifier(process.env.SUPABASE_JWT_SECRET);

export interface AdminSession {
  userId: string;
  email: string | null;
}

/** Verify a Supabase token and confirm the user is an ADMIN in our DB. */
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  const verified = await verifier.verify(token);
  if (!verified) return null;
  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { role: true, email: true },
  });
  if (!user || user.role !== 'ADMIN') return null;
  return { userId: verified.userId, email: user.email ?? verified.email };
}

/** Read the admin session from the request cookie, or null if not an admin. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}
