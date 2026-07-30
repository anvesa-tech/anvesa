import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for ANVESA (Requirement 1, 2, 3).
 * Handles OTP, Apple, and Google auth and persists the session. The access
 * token from this session is attached as a Bearer token on tRPC requests, and
 * the backend verifies it. Set EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY.
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** OTP: send a login code to a phone number (E.164). */
export function signInWithPhoneOtp(phone: string) {
  return supabase.auth.signInWithOtp({ phone });
}

/** OTP: verify the code and establish a session. */
export function verifyPhoneOtp(phone: string, token: string) {
  return supabase.auth.verifyOtp({ phone, token, type: 'sms' });
}

/** Apple / Google sign-in via ID token from the native flow. */
export function signInWithIdToken(provider: 'apple' | 'google', idToken: string) {
  return supabase.auth.signInWithIdToken({ provider, token: idToken });
}

/** Continue as an anonymous (guest) user; can be linked to a real account later. */
export function signInAsGuest() {
  return supabase.auth.signInAnonymously();
}

export function signOut() {
  return supabase.auth.signOut();
}

/** Current access token for authorizing backend (tRPC) requests. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
