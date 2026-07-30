import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';
import { createProduct, type ProductInput } from '@/infrastructure/prisma/adminQueries';

export const dynamic = 'force-dynamic';

/** Create a product, then compute its grade from composition (Requirement 27, 12.7). */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => null)) as ProductInput | null;
  if (!body?.name || !body.brandName || !body.categoryId) {
    return NextResponse.json({ error: 'Name, brand and category are required' }, { status: 400 });
  }

  try {
    const id = await createProduct(body);
    const grade = await getContainer().grading.recomputeFor(id);
    return NextResponse.json({ ok: true, id, grade });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
