import { NextResponse } from 'next/server';
import { getAdminSession } from '@/infrastructure/auth/adminSession';
import { getContainer } from '@/infrastructure/di/container';
import { ORDER_STATUSES, type OrderStatus } from '@/domain/orders/statusMachine';

export const dynamic = 'force-dynamic';

/** Admin order status transition (Requirement 27.5). State-machine validated. */
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { orderId?: string; status?: string };
  const { orderId, status } = body;
  if (!orderId || !status || !ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'Invalid order or status' }, { status: 400 });
  }

  const result = await getContainer().order.transition(orderId, status as OrderStatus, new Date());
  if (!result.ok) {
    const code = result.error === 'NOT_FOUND' ? 404 : 409;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  return NextResponse.json({ ok: true });
}
