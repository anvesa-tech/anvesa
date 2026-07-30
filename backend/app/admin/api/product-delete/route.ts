import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { deleteProduct } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

/** Delete a product (blocked if it appears in existing orders). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!body.productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

  const result = await deleteProduct(body.productId);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json({ ok: true });
}
