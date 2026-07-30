import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { setCouponActive } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

/** Activate/deactivate a coupon (Requirement 9, 27). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { id?: string; isActive?: boolean };
  if (!body.id || typeof body.isActive !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  await setCouponActive(body.id, body.isActive);
  return NextResponse.json({ ok: true });
}
