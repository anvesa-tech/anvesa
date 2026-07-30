import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyAdminToken } from '@/infrastructure/auth/adminSession';

export const dynamic = 'force-dynamic';

/**
 * Admin login (Requirement 27.7). Exchanges email+password for a Supabase
 * access token, confirms the user is an ADMIN in our DB, and stores the token
 * in an HTTP-only cookie. Non-admins are rejected without setting a cookie.
 */
export async function POST(req: Request) {
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anon, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const session = await verifyAdminToken(data.access_token);
  if (!session) {
    return NextResponse.json({ error: 'This account is not an administrator' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1h, matches Supabase access-token lifetime
  });
  return response;
}
