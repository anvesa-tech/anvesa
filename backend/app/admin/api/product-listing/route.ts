import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';

export const dynamic = 'force-dynamic';

/** Toggle a product's marketplace visibility (Requirement 27). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { productId?: string; isListed?: boolean };
  if (!body.productId || typeof body.isListed !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  await getContainer().admin.setProductListed(body.productId, body.isListed);
  return NextResponse.json({ ok: true });
}
