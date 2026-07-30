import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { createCoupon } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

/** Create a discount coupon (Requirement 9, 27). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    type?: string;
    value?: number;
    minOrderCents?: number;
    usageLimit?: number;
    expiresAt?: string;
  };

  if (
    !body.code ||
    (body.type !== 'PERCENT' && body.type !== 'FLAT') ||
    typeof body.value !== 'number' ||
    body.value <= 0 ||
    !body.expiresAt
  ) {
    return NextResponse.json({ error: 'Invalid coupon fields' }, { status: 400 });
  }

  try {
    await createCoupon({
      code: body.code,
      type: body.type,
      value: body.value,
      minOrderCents: body.minOrderCents ?? 0,
      usageLimit: body.usageLimit ?? 100,
      expiresAt: new Date(body.expiresAt),
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = (e as Error).message.includes('Unique') ? 'Coupon code already exists' : 'Create failed';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
