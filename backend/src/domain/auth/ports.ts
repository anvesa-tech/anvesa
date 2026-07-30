/**
 * Auth-related ports. Authentication (OTP / Apple / Google / sessions / refresh)
 * is delegated to Supabase Auth; the backend only verifies the Supabase access
 * token and mirrors the authenticated user into the local User table.
 */
export interface AuthUserRepository {
  findOrCreateByPhone(phone: string): Promise<{ id: string; role: string }>;
  findOrCreateBySocial(
    provider: 'apple' | 'google',
    subject: string,
  ): Promise<{ id: string; role: string }>;
  createGuest(): Promise<{ id: string; role: string }>;
  /** Ensure a local User row exists for a Supabase-authenticated user id. */
  ensure(userId: string, email: string | null, phone: string | null): Promise<void>;
}
