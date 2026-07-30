import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';

export const dynamic = 'force-dynamic';

/**
 * Recompute a product's grade from its composition (Requirement 27.8, 12.7).
 * Integrity-safe: this only re-runs the objective Grading_Engine — there is no
 * way to set a grade value manually. Override attempts are rejected + audited.
 */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { productId?: string };
  if (!body.productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 });
  }

  const grade = await getContainer().grading.recomputeFor(body.productId);
  if (grade === null) {
    return NextResponse.json({ error: 'Product has no composition data' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, grade });
}
