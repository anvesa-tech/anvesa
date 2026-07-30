import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';
import { updateProduct, type ProductInput } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

/** Update a product, then recompute its grade from composition (Requirement 27, 12.7). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as (ProductInput & { id?: string }) | null;
  if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (!body.name || !body.brandName || !body.categoryId) {
    return NextResponse.json({ error: 'Name, brand and category are required' }, { status: 400 });
  }

  try {
    await updateProduct(body.id, body);
    const grade = await getContainer().grading.recomputeFor(body.id);
    return NextResponse.json({ ok: true, grade });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
