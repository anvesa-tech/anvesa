import { getAccessToken } from '@/infrastructure/auth/supabase';

/**
 * fetch wrapper that attaches the current Supabase access token as a Bearer
 * header, so protected backend (tRPC) procedures authorize the request.
 */
export async function authedFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
